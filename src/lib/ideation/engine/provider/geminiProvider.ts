import type { Provider, ProviderGenerateOpts } from './types';
import { recordUsage } from './costTracker';
import type { ThinkingTier } from '../../state/sessionTypes';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface TierConfig {
  model: string;
  temperature: number;
  maxOutputTokens?: number;
}

const TIER_CONFIGS: Record<ThinkingTier, TierConfig> = {
  quick: {
    model: 'gemini-2.0-flash-lite',
    temperature: 0,
  },
  standard: {
    model: 'gemini-2.0-flash',
    temperature: 0,
  },
  deep: {
    model: 'gemini-2.0-flash-thinking-exp',
    temperature: 0.7,
    maxOutputTokens: 16384,
  },
};

function getEndpoint(tier: ThinkingTier): string {
  const cfg = TIER_CONFIGS[tier];
  return `${GEMINI_API_BASE}/${cfg.model}:generateContent`;
}

function getGenerationConfig(tier: ThinkingTier) {
  const cfg = TIER_CONFIGS[tier];
  const config: Record<string, unknown> = {
    temperature: cfg.temperature,
    responseMimeType: 'application/json',
  };
  if (cfg.maxOutputTokens) config.maxOutputTokens = cfg.maxOutputTokens;
  return config;
}

function resolveApiKey(explicitKey?: string): string | undefined {
  if (explicitKey) return explicitKey;
  try {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? undefined;
  } catch {
    return undefined;
  }
}

async function callGemini(prompt: string, tier: ThinkingTier = 'standard', apiKey?: string): Promise<string> {
  const key = resolveApiKey(apiKey);
  if (!key) throw new Error('No API key available. Set NEXT_PUBLIC_GEMINI_API_KEY in your .env.local file.');

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: getGenerationConfig(tier),
  };

  const response = await fetch(`${getEndpoint(tier)}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (data?.usageMetadata) recordUsage(data.usageMetadata);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text in Gemini response');
  return text;
}

async function callGeminiRetry(prompt: string, retryContext: string, tier: ThinkingTier = 'standard', apiKey?: string): Promise<string> {
  const key = resolveApiKey(apiKey);
  if (!key) throw new Error('No API key available. Set NEXT_PUBLIC_GEMINI_API_KEY in your .env.local file.');

  const body = {
    contents: [
      { role: 'user', parts: [{ text: prompt }] },
      { role: 'model', parts: [{ text: '(invalid response)' }] },
      { role: 'user', parts: [{ text: retryContext }] },
    ],
    generationConfig: getGenerationConfig(tier),
  };

  const response = await fetch(`${getEndpoint(tier)}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini retry API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (data?.usageMetadata) recordUsage(data.usageMetadata);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text in Gemini retry response');
  return text;
}

function parseJsonResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    throw new Error('Failed to parse Gemini JSON response');
  }
}

export function createGeminiProvider(apiKey?: string, tier: ThinkingTier = 'standard'): Provider {
  return {
    async generateStructured<T>(opts: ProviderGenerateOpts<T>): Promise<T> {
      const text = await callGemini(opts.prompt, tier, apiKey);
      const parsed = parseJsonResponse(text);

      try {
        return opts.schema.parse(parsed) as T;
      } catch (parseErr) {
        const retryContext =
          `Your previous response was invalid JSON. The exact error was: ${parseErr}. ` +
          `Please return ONLY valid JSON matching the schema. Previous response: ${text.slice(0, 500)}`;

        let retryText: string;
        try {
          retryText = await callGeminiRetry(opts.prompt, retryContext, tier, apiKey);
        } catch {
          throw parseErr;
        }

        let retryParsed: unknown;
        try {
          retryParsed = parseJsonResponse(retryText);
        } catch (jsonErr) {
          throw new Error(
            `Gemini retry JSON parse failed: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}. ` +
            `Original error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          );
        }

        try {
          return opts.schema.parse(retryParsed) as T;
        } catch (schemaErr) {
          throw new Error(
            `Gemini schema validation failed after retry: ${schemaErr instanceof Error ? schemaErr.message : String(schemaErr)}. ` +
            `Original error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          );
        }
      }
    },

    async multiSampleStructured<T>(
      opts: ProviderGenerateOpts<T> & { n: number },
    ): Promise<T[]> {
      const results: T[] = [];
      for (let i = 0; i < opts.n; i++) {
        const result = await this.generateStructured({
          schema: opts.schema,
          prompt: `${opts.prompt}\n[Sample ${i + 1} of ${opts.n}]`,
        });
        results.push(result);
      }
      return results;
    },
  };
}

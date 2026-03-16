/**
 * Shared Gemini text generation utility.
 * Calls the hub's /api/ai-generate proxy so API keys stay server-side.
 * Any tool package can import this without depending on hub internals.
 */

const PROXY_URL = "/api/ai-generate";
const DEFAULT_TIMEOUT_MS = 180_000;

export const GEMINI_FLASH_MODEL = "gemini-2.0-flash";
export const GEMINI_25_FLASH = "gemini-2.5-flash";
export const GEMINI_25_PRO = "gemini-2.5-pro";

/* ─── Retry Logic ────────────────────────────────────── */

const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseMs = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRetryable =
        err instanceof TypeError ||
        (err instanceof Error && /abort|network|fetch/i.test(err.message)) ||
        (err instanceof Error && RETRYABLE_STATUS.has(parseStatusFromError(err)));
      if (!isRetryable || attempt === maxRetries) throw err;
      await sleep(baseMs * Math.pow(2, attempt));
    }
  }
  throw new Error("withRetry: exhausted retries");
}

function parseStatusFromError(err: Error): number {
  const m = err.message.match(/error (\d{3}):/);
  return m ? parseInt(m[1], 10) : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type UsageCallback = (
  usage: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number },
  model: string,
) => void;

let _onUsage: UsageCallback | null = null;

export function setUsageCallback(cb: UsageCallback | null) {
  _onUsage = cb;
}

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export interface GenerateOptions {
  temperature?: number;
  image?: GeneratedImage;
  model?: string;
}

/* ─── Structured JSON Output ─────────────────────────── */

export interface StructuredOptions {
  temperature?: number;
  schema: Record<string, unknown>;
  model?: string;
}

export function generateStructured<T = unknown>(
  prompt: string,
  options: StructuredOptions,
): Promise<T> {
  return withRetry(() => _generateStructuredInner<T>(prompt, options));
}

async function _generateStructuredInner<T = unknown>(
  prompt: string,
  options: StructuredOptions,
): Promise<T> {
  const { temperature = 0.2, schema, model = GEMINI_FLASH_MODEL } = options;

  const body = JSON.stringify({
    model,
    method: "generateContent",
    body: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    },
  });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ac.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Gemini structured error ${res.status}: ${errText.slice(0, 400)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    if (_onUsage && json.usageMetadata) {
      try { _onUsage(json.usageMetadata, model); } catch { /* ignore */ }
    }

    const text =
      json.candidates?.[0]?.content?.parts
        ?.filter((p) => p.text)
        ?.map((p) => p.text)
        ?.join("") ?? "";

    if (!text) throw new Error(`No structured output returned from ${model}`);
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ─── Free-Text Generation ───────────────────────────── */

export function generateText(
  prompt: string,
  imageOrOpts?: GeneratedImage | GenerateOptions,
): Promise<string> {
  return withRetry(() => _generateTextInner(prompt, imageOrOpts));
}

async function _generateTextInner(
  prompt: string,
  imageOrOpts?: GeneratedImage | GenerateOptions,
): Promise<string> {
  let image: GeneratedImage | undefined;
  let temperature = 0.4;
  let model = GEMINI_FLASH_MODEL;

  if (imageOrOpts) {
    if ("base64" in imageOrOpts) {
      image = imageOrOpts;
    } else {
      image = imageOrOpts.image;
      if (imageOrOpts.temperature !== undefined) temperature = imageOrOpts.temperature;
      if (imageOrOpts.model) model = imageOrOpts.model;
    }
  }

  const parts: Array<Record<string, unknown>> = [];
  if (image) {
    parts.push({
      inlineData: { mimeType: image.mimeType, data: image.base64 },
    });
  }
  parts.push({ text: prompt });

  const body = JSON.stringify({
    model,
    method: "generateContent",
    body: {
      contents: [{ parts }],
      generationConfig: { temperature },
    },
  });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ac.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Gemini Flash error ${res.status}: ${errText.slice(0, 400)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    if (_onUsage && json.usageMetadata) {
      try { _onUsage(json.usageMetadata, model); } catch { /* ignore */ }
    }

    const text =
      json.candidates?.[0]?.content?.parts
        ?.filter((p) => p.text)
        ?.map((p) => p.text)
        ?.join("\n") ?? "";

    if (!text) throw new Error(`No text returned from ${model}`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Shared Gemini text generation utility.
 * Calls the hub's /api/ai-generate proxy so API keys stay server-side.
 * Any tool package can import this without depending on hub internals.
 */

const PROXY_URL = "/api/ai-generate";
const GEMINI_FLASH_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 180_000;

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
}

export async function generateText(
  prompt: string,
  imageOrOpts?: GeneratedImage | GenerateOptions,
): Promise<string> {
  let image: GeneratedImage | undefined;
  let temperature = 0.4;

  if (imageOrOpts) {
    if ("base64" in imageOrOpts) {
      image = imageOrOpts;
    } else {
      image = imageOrOpts.image;
      if (imageOrOpts.temperature !== undefined) temperature = imageOrOpts.temperature;
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
    model: GEMINI_FLASH_MODEL,
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
      try { _onUsage(json.usageMetadata, GEMINI_FLASH_MODEL); } catch { /* ignore */ }
    }

    const text =
      json.candidates?.[0]?.content?.parts
        ?.filter((p) => p.text)
        ?.map((p) => p.text)
        ?.join("\n") ?? "";

    if (!text) throw new Error("No text returned from Gemini Flash");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

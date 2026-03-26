/**
 * Shared Gemini text generation utility.
 * Calls the hub's /api/ai-generate proxy so API keys stay server-side.
 * Any tool package can import this without depending on hub internals.
 */

const PROXY_URL = "/api/ai-generate";
const DEFAULT_TIMEOUT_MS = 180_000;

let _overrideApiKey: string | null = null;

/**
 * Explicitly set the API key used for all Gemini requests from this package.
 * Call this from host apps that have their own settings management (e.g.
 * WritingShell subscribing to useGlobalSettings) to keep the key in sync
 * without relying solely on the localStorage read.
 */
export function setApiKey(key: string | null) {
  _overrideApiKey = key || null;
}

function getStoredApiKey(): string {
  if (_overrideApiKey) return _overrideApiKey;
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem('shawnderland-global-settings')
      : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.geminiApiKey ?? '';
    }
  } catch { /* SSR or corrupt */ }
  return '';
}

function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const key = getStoredApiKey();
  if (key) h["x-api-key"] = key;
  return h;
}

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
  images?: GeneratedImage[];
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
      headers: apiHeaders(),
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
  let images: GeneratedImage[] | undefined;
  let temperature = 0.4;
  let model = GEMINI_FLASH_MODEL;

  if (imageOrOpts) {
    if ("base64" in imageOrOpts) {
      image = imageOrOpts;
    } else {
      image = imageOrOpts.image;
      images = imageOrOpts.images;
      if (imageOrOpts.temperature !== undefined) temperature = imageOrOpts.temperature;
      if (imageOrOpts.model) model = imageOrOpts.model;
    }
  }

  const parts: Array<Record<string, unknown>> = [];
  if (images && images.length > 0) {
    for (const img of images) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
  } else if (image) {
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
      headers: apiHeaders(),
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

/* ─── Search-Grounded Text Generation ───────────────── */

export interface SearchGroundedResult {
  text: string;
  searchQueries: string[];
  sources: Array<{ uri: string; title: string }>;
}

export interface SearchGroundedOptions {
  model?: string;
  temperature?: number;
}

export function generateTextWithSearch(
  prompt: string,
  options?: SearchGroundedOptions,
): Promise<SearchGroundedResult> {
  return withRetry(() => _generateTextWithSearchInner(prompt, options));
}

async function _generateTextWithSearchInner(
  prompt: string,
  options?: SearchGroundedOptions,
): Promise<SearchGroundedResult> {
  const model = options?.model ?? GEMINI_FLASH_MODEL;
  const temperature = options?.temperature ?? 0.4;

  const body = JSON.stringify({
    model,
    method: "generateContent",
    body: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature },
      tools: [{ google_search: {} }],
    },
  });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: apiHeaders(),
      body,
      signal: ac.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Gemini search error ${res.status}: ${errText.slice(0, 400)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        groundingMetadata?: {
          webSearchQueries?: string[];
          groundingChunks?: Array<{ web?: { uri: string; title: string } }>;
        };
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

    const candidate = json?.candidates?.[0];

    const text = candidate?.content?.parts
      ?.filter((p) => p.text)
      ?.map((p) => p.text)
      ?.join("\n") ?? "";

    const gm = candidate?.groundingMetadata;
    const searchQueries = gm?.webSearchQueries ?? [];
    const sources = (gm?.groundingChunks ?? [])
      .filter((c) => c.web)
      .map((c) => ({ uri: c.web!.uri, title: c.web!.title }));

    return { text, searchQueries, sources };
  } finally {
    clearTimeout(timer);
  }
}

/* ─── Image Generation (Gemini multimodal output) ───── */

export const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp";

export interface ImageGenOptions {
  model?: string;
  referenceImages?: GeneratedImage[];
  temperature?: number;
  signal?: AbortSignal;
}

export interface ImageGenResult {
  text: string;
  images: GeneratedImage[];
}

export function generateImage(
  prompt: string,
  options?: ImageGenOptions,
): Promise<ImageGenResult> {
  return withRetry(() => _generateImageInner(prompt, options));
}

async function _generateImageInner(
  prompt: string,
  options?: ImageGenOptions,
): Promise<ImageGenResult> {
  const model = options?.model ?? GEMINI_IMAGE_MODEL;
  const temperature = options?.temperature ?? 0.8;

  const parts: Array<Record<string, unknown>> = [];
  if (options?.referenceImages?.length) {
    for (const img of options.referenceImages) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
  }
  parts.push({ text: prompt });

  const body = JSON.stringify({
    model,
    method: "generateContent",
    body: {
      contents: [{ parts }],
      generationConfig: {
        temperature,
        responseModalities: ["TEXT", "IMAGE"],
      },
    },
  });

  const ac = options?.signal ? undefined : new AbortController();
  const signal = options?.signal ?? ac!.signal;
  const timer = ac ? setTimeout(() => ac.abort(), DEFAULT_TIMEOUT_MS) : undefined;

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: apiHeaders(),
      body,
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Gemini image error ${res.status}: ${errText.slice(0, 400)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            inlineData?: { mimeType: string; data: string };
          }>;
        };
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

    const responseParts = json?.candidates?.[0]?.content?.parts ?? [];

    const text = responseParts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n");

    const images: GeneratedImage[] = responseParts
      .filter((p) => p.inlineData)
      .map((p) => ({
        base64: p.inlineData!.data,
        mimeType: p.inlineData!.mimeType,
      }));

    return { text, images };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

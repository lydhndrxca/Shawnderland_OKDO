const EMBED_URL = "/api/ai-embed";
const EMBED_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRetryable =
        err instanceof TypeError ||
        (err instanceof Error && /abort|network|fetch/i.test(err.message)) ||
        (err instanceof Error && RETRYABLE_STATUS.has(parseStatus(err)));
      if (!isRetryable || attempt === MAX_RETRIES) throw err;
      await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
    }
  }
  throw new Error("withRetry: exhausted retries");
}

function parseStatus(err: Error): number {
  const m = err.message.match(/error.*?(\d{3})/);
  return m ? parseInt(m[1], 10) : 0;
}

export async function embedText(text: string): Promise<number[]> {
  return withRetry(async () => {
    const res = await fetchWithTimeout(
      EMBED_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      },
      EMBED_TIMEOUT_MS,
    );
    if (!res.ok) {
      const err = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Embed error ${res.status}: ${err}`);
    }
    const json = await res.json();
    if (!Array.isArray(json.embedding)) {
      throw new Error("Embed response missing 'embedding' array");
    }
    return json.embedding;
  });
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return withRetry(async () => {
    const res = await fetchWithTimeout(
      EMBED_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      },
      EMBED_TIMEOUT_MS,
    );
    if (!res.ok) {
      const err = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Batch embed error ${res.status}: ${err}`);
    }
    const json = await res.json();
    if (!Array.isArray(json.embeddings)) {
      throw new Error("Batch embed response missing 'embeddings' array");
    }
    return json.embeddings;
  });
}

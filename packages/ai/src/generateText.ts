/**
 * Shared Gemini text generation utility.
 * Calls the hub's /api/ai-generate proxy so API keys stay server-side.
 * Any tool package can import this without depending on hub internals.
 */

const PROXY_URL = "/api/ai-generate";
const GEMINI_FLASH_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 180_000;

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export async function generateText(
  prompt: string,
  image?: GeneratedImage,
): Promise<string> {
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
      generationConfig: { temperature: 0.4 },
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
    };

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

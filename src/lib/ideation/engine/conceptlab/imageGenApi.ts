/* ────────────────────────────────────────
   ConceptLab — Shared Image Generation API
   Wraps Imagen 4 and Gemini image models for character/weapon generation.
   Routes through server-side proxy (reliable, avoids CORS/browser issues).
   ──────────────────────────────────────── */

import { recordImagenUsage, recordUsage } from '../provider/costTracker';
import { getActiveBackend as _getActiveBackend } from '../apiConfig';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
export type { ApiBackend } from '../apiConfig';
export { getActiveBackend } from '../apiConfig';

/* ── Model definitions ── */

export type GeminiImageModel = 'gemini-3-pro' | 'gemini-flash-image';

export const GEMINI_IMAGE_MODELS: Record<GeminiImageModel, {
  id: string;
  label: string;
  description: string;
}> = {
  'gemini-3-pro': {
    id: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro',
    description: 'Pro-quality reference-based generation. Higher fidelity, slower.',
  },
  'gemini-flash-image': {
    id: 'gemini-3.1-flash-image-preview',
    label: 'Gemini Flash Image',
    description: 'Flash-speed image generation (Nano Banana 2). Faster, good for iteration.',
  },
};

const DEFAULT_GEMINI_IMAGE_MODEL: GeminiImageModel = 'gemini-3-pro';

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/* ── Dual-path call: proxy → direct fallback ── */

const PROXY_URL = '/api/ai-generate';
const DEFAULT_TIMEOUT_MS = 120_000;

type MethodKind = 'generateContent' | 'predict' | 'predictLongRunning' | 'streamGenerateContent';

/**
 * Attempt a fetch with its own AbortController linked to a parent tracker.
 * Returns the parsed JSON on success, or null if a network/CORS error occurred
 * (so the caller can try a fallback). Throws on cancel, timeout, or API errors.
 */
async function attemptFetch(
  url: string,
  bodyStr: string,
  label: string,
  timeoutMs: number,
  tracker: AbortController,
): Promise<Record<string, unknown> | null> {
  const ac = new AbortController();
  const link = () => ac.abort();
  tracker.signal.addEventListener('abort', link);
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ac.abort(); }, timeoutMs);

  const t0 = Date.now();
  console.log(`[attemptFetch] → ${url.slice(0, 50)}… (${(bodyStr.length / 1024).toFixed(0)}KB, timeout=${timeoutMs / 1000}s)`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      signal: ac.signal,
    });

    console.log(`[attemptFetch] ← ${res.status} ${res.statusText} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    if (res.ok) {
      console.log(`[attemptFetch] parsing JSON response...`);
      const json = (await res.json()) as Record<string, unknown>;
      console.log(`[attemptFetch] ✓ JSON parsed (${((Date.now() - t0) / 1000).toFixed(1)}s total)`);
      return json;
    }

    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`${label} error ${res.status}: ${errText.slice(0, 400)}`);
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    if (tracker.signal.aborted) { console.error(`[attemptFetch] cancelled after ${elapsed}s`); throw new Error('Cancelled'); }
    if (timedOut) { console.error(`[attemptFetch] timed out after ${elapsed}s`); throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`); }
    if (err instanceof Error && err.message.startsWith(`${label} error`)) throw err;
    console.warn(`[attemptFetch] network error after ${elapsed}s: ${err instanceof Error ? err.message : err}`);
    return null;
  } finally {
    clearTimeout(timer);
    tracker.signal.removeEventListener('abort', link);
  }
}

async function callApi(
  model: string,
  method: MethodKind,
  body: Record<string, unknown>,
  label: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const tracker = registerRequest();

  try {
    const proxyBody = JSON.stringify({ model, method, body });
    console.log(`[imageGenApi] ${label} → proxy (${(proxyBody.length / 1024).toFixed(0)}KB)`);

    const result = await attemptFetch(PROXY_URL, proxyBody, label, timeoutMs, tracker);
    if (result) {
      console.log(`[imageGenApi] ${label} → proxy OK ✓`);
      return result;
    }

    throw new Error(`${label} failed — server proxy returned a network error. Is the dev server running?`);
  } finally {
    unregisterRequest(tracker);
  }
}

/* ── Imagen 4 (text → image) ── */

export async function generateWithImagen4(
  prompt: string,
  aspectRatio: string = '9:16',
  count: number = 1,
  model: string = 'imagen-4.0-generate-001',
): Promise<GeneratedImage[]> {
  const modelId = model;
  const supports2K = model !== 'imagen-4.0-fast-generate-001';

  const json = await callApi(
    modelId,
    'predict',
    {
      instances: [{ prompt }],
      parameters: {
        sampleCount: count,
        aspectRatio,
        ...(supports2K ? { sampleImageSize: '2K' } : {}),
      },
    },
    'Imagen 4',
    180_000,
  );

  const predictions = (json as { predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }> }).predictions;
  if (!predictions?.length) throw new Error('No images returned from Imagen 4');

  recordImagenUsage(modelId, predictions.length);

  return predictions.map((p) => ({
    base64: p.bytesBase64Encoded,
    mimeType: p.mimeType || 'image/png',
  }));
}

/* ── Gemini reference-based image generation ── */

export async function generateWithGeminiRef(
  prompt: string,
  referenceImage: GeneratedImage | GeneratedImage[],
  model: GeminiImageModel = DEFAULT_GEMINI_IMAGE_MODEL,
): Promise<GeneratedImage[]> {
  const modelDef = GEMINI_IMAGE_MODELS[model];
  const images = Array.isArray(referenceImage) ? referenceImage : [referenceImage];

  console.log(`[generateWithGeminiRef] model=${modelDef.id}, images=${images.length}, prompt length=${prompt.length}`);
  for (let i = 0; i < images.length; i++) {
    console.log(`[generateWithGeminiRef] image[${i}] mime=${images[i].mimeType} base64 length=${images[i].base64.length}`);
  }

  const parts: Array<Record<string, unknown>> = [
    ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
    { text: prompt },
  ];

  console.log('[generateWithGeminiRef] calling callApi...');
  const t0 = Date.now();

  const json = await callApi(
    modelDef.id,
    'generateContent',
    {
      contents: [{ parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    },
    modelDef.label,
  );

  console.log(`[generateWithGeminiRef] callApi returned in ${Date.now() - t0}ms`);

  if ((json as { usageMetadata?: object }).usageMetadata) {
    recordUsage(
      (json as { usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata,
      modelDef.id,
    );
  }

  const responseParts =
    ((json as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> })
      .candidates?.[0]?.content?.parts) ?? [];
  console.log(`[generateWithGeminiRef] response parts: ${responseParts.length}`);

  const imageParts = responseParts.filter(
    (p: Record<string, unknown>) => (p as { inlineData?: object }).inlineData,
  );
  console.log(`[generateWithGeminiRef] image parts: ${imageParts.length}, text parts: ${responseParts.filter((p: Record<string, unknown>) => (p as { text?: string }).text).length}`);

  if (imageParts.length === 0) {
    const textContent = responseParts
      .filter((p: Record<string, unknown>) => (p as { text?: string }).text)
      .map((p: Record<string, unknown>) => (p as { text: string }).text)
      .join('\n');
    console.error(`[generateWithGeminiRef] NO IMAGE in response. Text content: "${textContent.slice(0, 300)}"`);
    throw new Error(`No image returned from ${modelDef.label}${textContent ? ': ' + textContent.slice(0, 100) : ''}`);
  }

  console.log(`[generateWithGeminiRef] ✓ returning ${imageParts.length} image(s)`);
  return imageParts.map((p: Record<string, unknown>) => {
    const d = (p as { inlineData: { mimeType: string; data: string } }).inlineData;
    return { base64: d.data, mimeType: d.mimeType };
  });
}

/** Backward-compatible alias. */
export const generateWithGemini3Ref = generateWithGeminiRef;

/* ── Gemini text generation (attribute extraction, enhance) ── */

const GEMINI_FLASH_MODEL = 'gemini-2.0-flash';

export async function generateText(prompt: string, image?: GeneratedImage): Promise<string> {
  const parts: Array<Record<string, unknown>> = [];
  if (image) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }
  parts.push({ text: prompt });

  const json = await callApi(
    GEMINI_FLASH_MODEL,
    'generateContent',
    {
      contents: [{ parts }],
      generationConfig: { temperature: 0.4 },
    },
    'Gemini Flash',
  );

  if ((json as { usageMetadata?: object }).usageMetadata) {
    recordUsage(
      (json as { usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata,
      GEMINI_FLASH_MODEL,
    );
  }

  const text =
    ((json as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      .candidates?.[0]?.content?.parts
      ?.filter((p) => p.text)
      ?.map((p) => p.text)
      ?.join('\n')) ?? '';

  if (!text) throw new Error('No text returned from Gemini Flash');
  return text;
}

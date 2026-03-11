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
    if (tracker.signal.aborted) { console.log(`[attemptFetch] cancelled after ${elapsed}s`); throw new Error('Cancelled'); }
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

export interface ImagenSubjectRef {
  image: GeneratedImage;
  referenceType?: 'REFERENCE_TYPE_SUBJECT' | 'REFERENCE_TYPE_STYLE';
}

export async function generateWithImagen4(
  prompt: string,
  aspectRatio: string = '9:16',
  count: number = 1,
  model: string = 'imagen-4.0-generate-001',
  subjectRefs?: ImagenSubjectRef[],
): Promise<GeneratedImage[]> {
  const modelId = model;
  const supports2K = model !== 'imagen-4.0-fast-generate-001';

  const instance: Record<string, unknown> = { prompt };
  if (subjectRefs?.length) {
    instance.referenceImages = subjectRefs.map((ref) => ({
      referenceImage: { bytesBase64Encoded: ref.image.base64 },
      referenceType: ref.referenceType ?? 'REFERENCE_TYPE_SUBJECT',
    }));
  }

  const json = await callApi(
    modelId,
    'predict',
    {
      instances: [instance],
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

async function _geminiRefCall(
  modelDef: { id: string; label: string },
  parts: Array<Record<string, unknown>>,
): Promise<GeneratedImage[]> {
  const t0 = Date.now();
  console.log(`[generateWithGeminiRef] calling callApi (${modelDef.label})...`);

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

const FALLBACK_ORDER: GeminiImageModel[] = ['gemini-3-pro', 'gemini-flash-image'];
const PRO_RETRY_DELAY_MS = 2000;
const PRO_MAX_RETRIES = 2;

export interface GeminiRefResult {
  images: GeneratedImage[];
  modelUsed: string;
}

export async function generateWithGeminiRef(
  prompt: string,
  referenceImage: GeneratedImage | GeneratedImage[],
  model: GeminiImageModel = DEFAULT_GEMINI_IMAGE_MODEL,
): Promise<GeneratedImage[]> {
  const result = await generateWithGeminiRefDetailed(prompt, referenceImage, model);
  return result.images;
}

export async function generateWithGeminiRefDetailed(
  prompt: string,
  referenceImage: GeneratedImage | GeneratedImage[],
  model: GeminiImageModel = DEFAULT_GEMINI_IMAGE_MODEL,
): Promise<GeminiRefResult> {
  const images = Array.isArray(referenceImage) ? referenceImage : [referenceImage];

  console.log(`[generateWithGeminiRef] model=${model}, images=${images.length}, prompt length=${prompt.length}`);
  for (let i = 0; i < images.length; i++) {
    console.log(`[generateWithGeminiRef] image[${i}] mime=${images[i].mimeType} base64 length=${images[i].base64.length}`);
  }

  const parts: Array<Record<string, unknown>> = [
    ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
    { text: prompt },
  ];

  const modelsToTry = [model, ...FALLBACK_ORDER.filter((m) => m !== model)];

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelKey = modelsToTry[i];
    const modelDef = GEMINI_IMAGE_MODELS[modelKey];
    const isPro = modelKey === 'gemini-3-pro';
    const retries = isPro ? PRO_MAX_RETRIES : 1;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[generateWithGeminiRef] Retry ${attempt}/${retries - 1} for ${modelDef.label} after ${PRO_RETRY_DELAY_MS}ms…`);
          await new Promise((r) => setTimeout(r, PRO_RETRY_DELAY_MS));
        }
        const result = await _geminiRefCall(modelDef, parts);
        return { images: result, modelUsed: modelDef.label };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isServerError = /error\s*(5\d{2})/i.test(msg) || msg.includes('INTERNAL');

        if (isServerError && attempt < retries - 1) {
          console.warn(`[generateWithGeminiRef] ${modelDef.label} attempt ${attempt + 1} failed (server error), retrying…`);
          continue;
        }

        const isLast = i === modelsToTry.length - 1;
        if (isServerError && !isLast) {
          const next = GEMINI_IMAGE_MODELS[modelsToTry[i + 1]];
          console.warn(`[generateWithGeminiRef] ${modelDef.label} exhausted ${retries} attempt(s), falling back to ${next.label}…`);
          break;
        }
        throw err;
      }
    }
  }

  throw new Error('All Gemini image models failed');
}

/** Backward-compatible alias. */
export const generateWithGemini3Ref = generateWithGeminiRef;

/* ── Imagen 4 Upscale ── */

export type UpscaleFactor = 'x2' | 'x3' | 'x4';

export async function upscaleWithImagen(
  image: GeneratedImage,
  upscaleFactor: UpscaleFactor = 'x2',
  prompt: string = '',
): Promise<GeneratedImage> {
  const modelId = 'imagen-4.0-upscale-preview';

  const json = await callApi(
    modelId,
    'predict',
    {
      instances: [{
        prompt: prompt || 'Upscale this image with maximum detail preservation',
        image: { bytesBase64Encoded: image.base64 },
      }],
      parameters: {
        mode: 'upscale',
        upscaleConfig: { upscaleFactor },
      },
    },
    'Imagen Upscale',
    180_000,
  );

  const predictions = (json as { predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }> }).predictions;
  if (!predictions?.length) throw new Error('No image returned from Imagen Upscale');

  recordImagenUsage(modelId, 1);

  return {
    base64: predictions[0].bytesBase64Encoded,
    mimeType: predictions[0].mimeType || 'image/png',
  };
}

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

/* ── Quality Restoration (describe → regenerate with subject anchor) ── */

const DESCRIBE_FOR_RESTORE_PROMPT =
  'Describe this image in EXHAUSTIVE detail for exact reproduction. Cover every aspect:\n' +
  '1. SUBJECT: Who/what — age, gender, ethnicity, build, face, expression, hair\n' +
  '2. POSE: Exact body position, posture, hands, gaze direction\n' +
  '3. CLOTHING: Every garment head-to-toe — type, exact color, fit, fabric, wear\n' +
  '4. ACCESSORIES: Every item — belt, watch, bag, jewelry — exact placement & material\n' +
  '5. COLORS: Precise shades (not "blue" — "steel blue", "warm caramel", etc.)\n' +
  '6. MATERIALS: Surface qualities — matte, glossy, leather grain, metal finish\n' +
  '7. LIGHTING: Direction, temperature, shadows, highlights\n' +
  '8. BACKGROUND: Exact description (solid grey, gradient, environment)\n' +
  '9. CAMERA: Framing (full body/3-quarter/close-up), angle, focal length feel\n' +
  '10. ART STYLE: Photorealistic, rendered, illustrated?\n\n' +
  'Write as one continuous image generation prompt. Start directly, no preamble. Be specific.';

function detectAspectRatio(w: number, h: number): string {
  const ratio = w / h;
  const candidates = [
    { label: '1:1', value: 1 },
    { label: '9:16', value: 9 / 16 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:4', value: 3 / 4 },
    { label: '4:3', value: 4 / 3 },
  ];
  let best = candidates[0];
  let bestDiff = Math.abs(ratio - best.value);
  for (const c of candidates) {
    const diff = Math.abs(ratio - c.value);
    if (diff < bestDiff) { best = c; bestDiff = diff; }
  }
  return best.label;
}

export interface RestoreResult {
  image: GeneratedImage;
}

export async function restoreImageQuality(
  sourceImage: GeneratedImage,
  opts: {
    imageWidth?: number;
    imageHeight?: number;
    onStatus?: (msg: string) => void;
  } = {},
): Promise<RestoreResult> {
  const { onStatus } = opts;

  onStatus?.('Analyzing image…');
  const description = await generateText(DESCRIBE_FOR_RESTORE_PROMPT, sourceImage);
  console.log('[restoreImageQuality] Description length:', description.length);

  const ar = (opts.imageWidth && opts.imageHeight)
    ? detectAspectRatio(opts.imageWidth, opts.imageHeight)
    : '3:4';

  const prompt =
    'EXACT REPRODUCTION at maximum quality and resolution. ' +
    'Reproduce this precise image with no changes whatsoever — same pose, same outfit, same colors, same background, same everything. ' +
    'Just render at the highest possible fidelity:\n\n' + description;

  onStatus?.('Regenerating at 2K quality…');
  const results = await generateWithImagen4(
    prompt,
    ar,
    1,
    'imagen-4.0-generate-001',
    [{ image: sourceImage, referenceType: 'REFERENCE_TYPE_SUBJECT' }],
  );

  const result = results[0];
  if (!result) throw new Error('No image returned from restoration');

  return { image: result };
}

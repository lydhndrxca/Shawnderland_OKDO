/* ────────────────────────────────────────
   ConceptLab — Shared Image Generation API
   Wraps Imagen 4 and Gemini image models for character/weapon generation.
   Routes through server-side proxy (reliable, avoids CORS/browser issues).
   ──────────────────────────────────────── */

import { recordImagenUsage, recordUsage } from '../provider/costTracker';
import { getActiveBackend as _getActiveBackend } from '../apiConfig';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import { devLog, devWarn } from '@/lib/devLog';
export type { ApiBackend } from '../apiConfig';
export { getActiveBackend } from '../apiConfig';

/* ── Model definitions ── */

export type GeminiImageModel =
  | 'gemini-flash-image'
  | 'gemini-3-pro'
  | 'gemini-2.5-flash';

export const GEMINI_IMAGE_MODELS: Record<GeminiImageModel, {
  id: string;
  label: string;
  description: string;
}> = {
  'gemini-flash-image': {
    id: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    description: '4K multimodal image generation. Excellent prompt following, fast.',
  },
  'gemini-3-pro': {
    id: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    description: 'Pro-quality reference-based generation. Higher fidelity, slower.',
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash-image',
    label: 'Gemini 2.5 Flash',
    description: 'Fast multimodal with image gen. Good balance of speed and quality.',
  },
};

const DEFAULT_GEMINI_IMAGE_MODEL: GeminiImageModel = 'gemini-flash-image';

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/* ── Dual-path call: proxy → direct fallback ── */

const PROXY_URL = '/api/ai-generate';
const DEFAULT_TIMEOUT_MS = 180_000;

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
  devLog(`[attemptFetch] → ${url.slice(0, 50)}… (${(bodyStr.length / 1024).toFixed(0)}KB, timeout=${timeoutMs / 1000}s)`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      signal: ac.signal,
    });

    devLog(`[attemptFetch] ← ${res.status} ${res.statusText} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    if (res.ok) {
      devLog(`[attemptFetch] parsing JSON response...`);
      const json = (await res.json()) as Record<string, unknown>;
      devLog(`[attemptFetch] ✓ JSON parsed (${((Date.now() - t0) / 1000).toFixed(1)}s total)`);
      return json;
    }

    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`${label} error ${res.status}: ${errText.slice(0, 400)}`);
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    if (tracker.signal.aborted) { devLog(`[attemptFetch] cancelled after ${elapsed}s`); throw new Error('Cancelled'); }
    if (timedOut) { console.error(`[attemptFetch] timed out after ${elapsed}s`); throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`); }
    if (err instanceof Error && err.message.startsWith(`${label} error`)) throw err;
    devWarn(`[attemptFetch] network error after ${elapsed}s: ${err instanceof Error ? err.message : err}`);
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
    devLog(`[imageGenApi] ${label} → proxy (${(proxyBody.length / 1024).toFixed(0)}KB)`);

    const result = await attemptFetch(PROXY_URL, proxyBody, label, timeoutMs, tracker);
    if (result) {
      devLog(`[imageGenApi] ${label} → proxy OK ✓`);
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

  const params: Record<string, unknown> = {
    sampleCount: count,
    aspectRatio,
    ...(supports2K ? { sampleImageSize: '2K' } : {}),
  };

  const json = await callApi(
    modelId,
    'predict',
    {
      instances: [instance],
      parameters: params,
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

/* ── Nano Banana 2 — text-to-image (no reference) ── */

const NB2_MODEL_ID = 'gemini-3.1-flash-image-preview';
const NB2_LABEL = 'Nano Banana 2';

export function getConfiguredResolution(): string {
  return '4K';
}

const NB2_CAPABLE = new Set([
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
]);

function getImageConfig(modelId: string, aspectRatio?: string): Record<string, unknown> | undefined {
  const cfg: Record<string, unknown> = {};
  if (NB2_CAPABLE.has(modelId)) cfg.imageSize = '4K';
  if (aspectRatio) cfg.aspectRatio = aspectRatio;
  return Object.keys(cfg).length > 0 ? cfg : undefined;
}

export async function generateWithNanoBanana(
  prompt: string,
  aspectRatio: string = '9:16',
  count: number = 1,
  modelId?: string,
): Promise<GeneratedImage[]> {
  const model = modelId || NB2_MODEL_ID;
  const label = model === NB2_MODEL_ID ? NB2_LABEL : model === 'gemini-3-pro-image-preview' ? 'Nano Banana Pro' : `Gemini (${model})`;

  const parts: Array<Record<string, unknown>> = [
    { text: `${prompt}\n\nAspect ratio: ${aspectRatio}. Generate ${count} image(s).` },
  ];

  const imgCfg = getImageConfig(model, aspectRatio);
  const json = await callApi(
    model,
    'generateContent',
    {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        ...(imgCfg && { imageConfig: imgCfg }),
      },
    },
    label,
    180_000,
  );

  if ((json as { usageMetadata?: object }).usageMetadata) {
    recordUsage(
      (json as { usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata,
      model,
    );
  }

  const responseParts =
    ((json as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> })
      .candidates?.[0]?.content?.parts) ?? [];

  const imageParts = responseParts.filter(
    (p: Record<string, unknown>) => (p as { inlineData?: object }).inlineData,
  );

  if (imageParts.length === 0) {
    const textContent = responseParts
      .filter((p: Record<string, unknown>) => (p as { text?: string }).text)
      .map((p: Record<string, unknown>) => (p as { text: string }).text)
      .join('\n');
    throw new Error(`No image returned from ${label}${textContent ? ': ' + textContent.slice(0, 100) : ''}`);
  }

  return imageParts.map((p: Record<string, unknown>) => {
    const d = (p as { inlineData: { mimeType: string; data: string } }).inlineData;
    return { base64: d.data, mimeType: d.mimeType };
  });
}

/* ── Gemini reference-based image generation ── */

async function _geminiRefCall(
  modelDef: { id: string; label: string },
  parts: Array<Record<string, unknown>>,
  aspectRatio?: string,
): Promise<GeneratedImage[]> {
  const t0 = Date.now();
  devLog(`[generateWithGeminiRef] calling callApi (${modelDef.label}), aspectRatio=${aspectRatio ?? 'default'}...`);

  const imgCfg = getImageConfig(modelDef.id, aspectRatio);
  const json = await callApi(
    modelDef.id,
    'generateContent',
    {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        ...(imgCfg && { imageConfig: imgCfg }),
      },
    },
    modelDef.label,
  );

  devLog(`[generateWithGeminiRef] callApi returned in ${Date.now() - t0}ms`);

  if ((json as { usageMetadata?: object }).usageMetadata) {
    recordUsage(
      (json as { usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata,
      modelDef.id,
    );
  }

  const responseParts =
    ((json as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> })
      .candidates?.[0]?.content?.parts) ?? [];
  devLog(`[generateWithGeminiRef] response parts: ${responseParts.length}`);

  const imageParts = responseParts.filter(
    (p: Record<string, unknown>) => (p as { inlineData?: object }).inlineData,
  );
  devLog(`[generateWithGeminiRef] image parts: ${imageParts.length}, text parts: ${responseParts.filter((p: Record<string, unknown>) => (p as { text?: string }).text).length}`);

  if (imageParts.length === 0) {
    const textContent = responseParts
      .filter((p: Record<string, unknown>) => (p as { text?: string }).text)
      .map((p: Record<string, unknown>) => (p as { text: string }).text)
      .join('\n');
    console.error(`[generateWithGeminiRef] NO IMAGE in response. Text content: "${textContent.slice(0, 300)}"`);
    throw new Error(`No image returned from ${modelDef.label}${textContent ? ': ' + textContent.slice(0, 100) : ''}`);
  }

  devLog(`[generateWithGeminiRef] ✓ returning ${imageParts.length} image(s)`);
  return imageParts.map((p: Record<string, unknown>) => {
    const d = (p as { inlineData: { mimeType: string; data: string } }).inlineData;
    return { base64: d.data, mimeType: d.mimeType };
  });
}

const FALLBACK_ORDER: GeminiImageModel[] = ['gemini-flash-image', 'gemini-3-pro', 'gemini-2.5-flash'];
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
  aspectRatio?: string,
): Promise<GeneratedImage[]> {
  const result = await generateWithGeminiRefDetailed(prompt, referenceImage, model, aspectRatio);
  return result.images;
}

export async function generateWithGeminiRefDetailed(
  prompt: string,
  referenceImage: GeneratedImage | GeneratedImage[],
  model: GeminiImageModel = DEFAULT_GEMINI_IMAGE_MODEL,
  aspectRatio?: string,
): Promise<GeminiRefResult> {
  const images = Array.isArray(referenceImage) ? referenceImage : [referenceImage];

  devLog(`[generateWithGeminiRef] model=${model}, images=${images.length}, prompt length=${prompt.length}`);
  for (let i = 0; i < images.length; i++) {
    devLog(`[generateWithGeminiRef] image[${i}] mime=${images[i].mimeType} base64 length=${images[i].base64.length}`);
  }

  const promptWithAspect = aspectRatio ? `${prompt}\n\nOutput aspect ratio: ${aspectRatio}.` : prompt;
  const parts: Array<Record<string, unknown>> = [
    ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
    { text: promptWithAspect },
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
          devLog(`[generateWithGeminiRef] Retry ${attempt}/${retries - 1} for ${modelDef.label} after ${PRO_RETRY_DELAY_MS}ms…`);
          await new Promise((r) => setTimeout(r, PRO_RETRY_DELAY_MS));
        }
        const result = await _geminiRefCall(modelDef, parts, aspectRatio);
        return { images: result, modelUsed: modelDef.label };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isServerError = /error\s*(5\d{2})/i.test(msg) || msg.includes('INTERNAL');

        if (isServerError && attempt < retries - 1) {
          devWarn(`[generateWithGeminiRef] ${modelDef.label} attempt ${attempt + 1} failed (server error), retrying…`);
          continue;
        }

        const isLast = i === modelsToTry.length - 1;
        if (isServerError && !isLast) {
          const next = GEMINI_IMAGE_MODELS[modelsToTry[i + 1]];
          devWarn(`[generateWithGeminiRef] ${modelDef.label} exhausted ${retries} attempt(s), falling back to ${next.label}…`);
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
  'You are a forensic character analyst. Describe this image with OBSESSIVE precision so it can be exactly recreated. ' +
  'Ignore any blur, artifacts, noise, or compression — describe what the character ACTUALLY looks like underneath the degradation.\n\n' +
  'Cover EVERY aspect in this exact order:\n' +
  '1. POSE & STANCE: Exact body position — which leg bears weight, arm positions, hand positions (open/fist/relaxed), head tilt, gaze direction, torso angle\n' +
  '2. FACE: Exact features — eye shape/color, brow shape, nose shape, lip shape/color, jaw shape, skin tone (precise shade), expression, any facial hair\n' +
  '3. HAIR: Style, length, color (precise shade), texture (straight/wavy/curly), how it falls, any accessories in hair\n' +
  '4. HEAD-TO-TOE CLOTHING — describe each garment separately:\n' +
  '   • Headwear/masks/helmets\n' +
  '   • Upper body: collar type, sleeve length, fit, closures, layering order\n' +
  '   • Lower body: type, fit, length\n' +
  '   • Footwear: type, height, closures, sole\n' +
  '5. MATERIALS for each garment: exact material (leather, denim, silk, etc.), surface finish (matte/glossy/worn), texture pattern, color (precise shade like "oxblood leather" not "red")\n' +
  '6. ACCESSORIES: Every single item — belts, buckles, chains, jewelry, weapons, pouches, straps — exact placement on body, material, color\n' +
  '7. MARKINGS: Any tattoos, scars, face paint, body paint — exact location, design, colors\n' +
  '8. PROPORTIONS: Body type, height impression, shoulder width relative to hips\n' +
  '9. CAMERA: Framing (full body/3-quarter), angle (eye-level/low/high), approximate focal length feel\n' +
  '10. BACKGROUND: Describe exactly what is behind the character\n\n' +
  'Write as one continuous, dense image generation prompt. No preamble, no commentary. Be surgically specific.';

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
  devLog('[restoreImageQuality] Description length:', description.length);

  const ar = (opts.imageWidth && opts.imageHeight)
    ? detectAspectRatio(opts.imageWidth, opts.imageHeight)
    : '3:4';

  const prompt =
    'QUALITY RESTORATION — RECREATE THIS EXACT CHARACTER AT MAXIMUM FIDELITY.\n\n' +
    'The reference image has suffered quality degradation (blur, artifacts, noise, compression). ' +
    'Your job: recreate this SAME EXACT PERSON in the SAME EXACT POSE with the SAME EXACT OUTFIT — but rendered fresh with full resolution detail.\n\n' +
    'WHAT MUST STAY IDENTICAL:\n' +
    '• Same person — same face, same expression, same skin tone, same hair\n' +
    '• Same pose — same weight distribution, same arm/hand/leg positions, same head tilt, same gaze\n' +
    '• Same outfit — same garments, same colors, same layering, same fit\n' +
    '• Same accessories — same items in same positions\n' +
    '• Same camera angle and framing\n' +
    '• Same proportions and body type\n\n' +
    'WHAT MUST BE FRESHLY RENDERED AT FULL QUALITY:\n' +
    '• SKIN: Natural pores, subsurface scattering, clean tone — no muddy patches or blotchy areas\n' +
    '• MATERIALS: Leather shows real grain and sheen. Metal is properly reflective. Fabric has visible weave and natural drape. Everything has correct specular response\n' +
    '• EDGES: All edges crisp and clean — no blur halos, no ringing, no smearing\n' +
    '• HAIR: Individual strand definition, natural flow, proper highlights\n' +
    '• BACKGROUND: Clean solid neutral grey — smooth gradient-free, no artifacts from the original\n' +
    '• LIGHTING: Proper studio lighting — soft key, gentle fill, subtle rim light for depth\n' +
    '• ZERO artifacts, noise, banding, blur, or compression anywhere in the image\n' +
    '• ZERO TEXT — do NOT render any text, letters, numbers, hex codes, color codes, logos, labels, or watermarks anywhere in the image\n\n' +
    'DETAILED CHARACTER DESCRIPTION (recreate this exactly):\n' + description;

  onStatus?.('Recreating at max quality (Nano Banana 2)…');
  const results = await generateWithGeminiRef(
    prompt,
    sourceImage,
    'gemini-flash-image',
  );

  const result = results[0];
  if (!result) throw new Error('No image returned from restoration');

  return { image: result };
}

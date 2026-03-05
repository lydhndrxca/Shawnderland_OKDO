/* ────────────────────────────────────────
   ConceptLab — Shared Image Generation API
   Wraps Imagen 4 and Gemini image models for character/weapon generation.
   Routes through the shared apiConfig for dual Vertex AI / AI Studio support.
   ──────────────────────────────────────── */

import { recordImagenUsage, recordUsage } from '../provider/costTracker';
import { buildModelUrl, getActiveBackend as _getActiveBackend } from '../apiConfig';
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
    id: 'gemini-2.0-flash-preview-image-generation',
    label: 'Gemini Flash Image',
    description: 'Flash-speed image generation. Faster, good for iteration.',
  },
};

const DEFAULT_GEMINI_IMAGE_MODEL: GeminiImageModel = 'gemini-3-pro';

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/* ── Shared fetch helper ── */

async function geminiGenerateContent(
  modelId: string,
  body: Record<string, unknown>,
  label: string,
): Promise<Record<string, unknown>> {
  const url = buildModelUrl(modelId, 'generateContent');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    const backend = _getActiveBackend();
    throw new Error(`${label} error ${res.status} [${backend}]: ${errText.slice(0, 400)}`);
  }

  return res.json();
}

/* ── Imagen 4 (text → image) ── */

export async function generateWithImagen4(
  prompt: string,
  aspectRatio: string = '9:16',
  count: number = 1,
): Promise<GeneratedImage[]> {
  const modelId = 'imagen-4.0-generate-001';
  const url = buildModelUrl(modelId, 'predict');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: count, aspectRatio },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    const backend = _getActiveBackend();
    throw new Error(`Imagen 4 error ${res.status} [${backend}]: ${errText.slice(0, 400)}`);
  }

  const json = await res.json();
  const predictions = json?.predictions;
  if (!predictions?.length) throw new Error('No images returned from Imagen 4');

  recordImagenUsage(modelId, predictions.length);

  return predictions.map((p: { bytesBase64Encoded: string; mimeType?: string }) => ({
    base64: p.bytesBase64Encoded,
    mimeType: p.mimeType || 'image/png',
  }));
}

/* ── Gemini reference-based image generation ── */

export async function generateWithGeminiRef(
  prompt: string,
  referenceImage: GeneratedImage,
  model: GeminiImageModel = DEFAULT_GEMINI_IMAGE_MODEL,
): Promise<GeneratedImage[]> {
  const modelDef = GEMINI_IMAGE_MODELS[model];

  const parts: Array<Record<string, unknown>> = [
    { inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.base64 } },
    { text: prompt },
  ];

  const json = await geminiGenerateContent(
    modelDef.id,
    {
      contents: [{ parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    },
    modelDef.label,
  );

  if ((json as { usageMetadata?: object }).usageMetadata) {
    recordUsage(
      (json as { usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata,
      modelDef.id,
    );
  }

  const responseParts =
    ((json as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> })
      .candidates?.[0]?.content?.parts) ?? [];

  const imageParts = responseParts.filter(
    (p: Record<string, unknown>) => (p as { inlineData?: object }).inlineData,
  );

  if (imageParts.length === 0) throw new Error(`No image returned from ${modelDef.label}`);

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

  const json = await geminiGenerateContent(
    GEMINI_FLASH_MODEL,
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

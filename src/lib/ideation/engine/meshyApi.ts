/**
 * Client-side Meshy API helpers.
 * Calls go through /api/meshy to keep the API key server-side.
 */

import { getGlobalSettings } from '@/lib/globalSettings';

function meshyHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getGlobalSettings().meshyApiKey;
  if (key) h['x-meshy-key'] = key;
  return h;
}

export interface MeshyTaskResult {
  id: string;
  type: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  progress: number;
  model_urls: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
    mtl?: string;
    pre_remeshed_glb?: string;
  };
  thumbnail_url?: string;
  texture_urls?: Array<{
    base_color?: string;
    metallic?: string;
    normal?: string;
    roughness?: string;
  }>;
  task_error?: { message: string };
  preceding_tasks?: number;
  started_at?: number;
  created_at?: number;
  finished_at?: number;
}

export interface MeshyCreateParams {
  ai_model?: 'latest' | 'meshy-6' | 'meshy-5';
  topology?: 'triangle' | 'quad';
  target_polycount?: number;
  symmetry_mode?: 'on' | 'auto' | 'off';
  pose_mode?: '' | 't-pose' | 'a-pose';
  should_remesh?: boolean;
  should_texture?: boolean;
  enable_pbr?: boolean;
  image_enhancement?: boolean;
  remove_lighting?: boolean;
  texture_prompt?: string;
}

export async function createImageTo3D(
  imageBase64: string,
  mimeType: string,
  params: MeshyCreateParams = {},
): Promise<string> {
  const dataUri = `data:${mimeType};base64,${imageBase64}`;
  const res = await fetch('/api/meshy', {
    method: 'POST',
    headers: meshyHeaders(),
    body: JSON.stringify({
      action: 'create-image-to-3d',
      image_url: dataUri,
      ...params,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || `Meshy error ${res.status}`);
  return json.result as string;
}

export async function createMultiImageTo3D(
  images: Array<{ base64: string; mimeType: string }>,
  params: MeshyCreateParams = {},
): Promise<string> {
  const imageUrls = images.map(
    (img) => `data:${img.mimeType};base64,${img.base64}`,
  );
  const res = await fetch('/api/meshy', {
    method: 'POST',
    headers: meshyHeaders(),
    body: JSON.stringify({
      action: 'create-multi-image-to-3d',
      image_urls: imageUrls,
      ...params,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || `Meshy error ${res.status}`);
  return json.result as string;
}

export async function pollTask(
  taskId: string,
  isMulti: boolean,
): Promise<MeshyTaskResult> {
  const res = await fetch('/api/meshy', {
    method: 'POST',
    headers: meshyHeaders(),
    body: JSON.stringify({ action: 'poll-image-to-3d', taskId, isMulti }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || `Poll error ${res.status}`);
  return json as MeshyTaskResult;
}

export async function exportModel(
  url: string,
  dir: string,
  filename: string,
): Promise<{ path: string; size: number }> {
  const res = await fetch('/api/meshy-export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, dir, filename }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Export error ${res.status}`);
  return json as { path: string; size: number };
}

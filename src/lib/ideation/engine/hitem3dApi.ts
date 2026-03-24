/**
 * Client-side Hitem3D API helpers.
 * Calls go through /api/hitem3d to keep API keys server-side.
 */

import { getGlobalSettings } from '@/lib/globalSettings';

function hitemHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const s = getGlobalSettings();
  if (s.hitem3dAccessKey) h['x-hitem3d-access'] = s.hitem3dAccessKey;
  if (s.hitem3dSecretKey) h['x-hitem3d-secret'] = s.hitem3dSecretKey;
  return h;
}

/* ── Types ──────────────────────────────────────────────────────── */

export type Hitem3DRequestType = 1 | 2 | 3;
export type Hitem3DModel =
  | 'hitem3dv1.5'
  | 'hitem3dv2.0'
  | 'scene-portraitv1.5'
  | 'scene-portraitv2.0'
  | 'scene-portraitv2.1';
export type Hitem3DResolution = '512' | '1024' | '1536' | '1536pro';
export type Hitem3DFormat = 1 | 2 | 3 | 4 | 5;

export const FORMAT_LABELS: Record<Hitem3DFormat, string> = {
  1: '.obj',
  2: '.glb',
  3: '.stl',
  4: '.fbx',
  5: '.usdz',
};

export const FORMAT_EXT: Record<Hitem3DFormat, string> = {
  1: 'obj',
  2: 'glb',
  3: 'stl',
  4: 'fbx',
  5: 'usdz',
};

export const MODEL_INFO: Record<Hitem3DModel, {
  label: string;
  resolutions: Hitem3DResolution[];
  supportsStaged: boolean;
}> = {
  'hitem3dv1.5': {
    label: 'General v1.5',
    resolutions: ['512', '1024', '1536', '1536pro'],
    supportsStaged: true,
  },
  'hitem3dv2.0': {
    label: 'General v2.0 (HQ)',
    resolutions: ['1536', '1536pro'],
    supportsStaged: false,
  },
  'scene-portraitv1.5': {
    label: 'Portrait v1.5',
    resolutions: ['1536'],
    supportsStaged: false,
  },
  'scene-portraitv2.0': {
    label: 'Portrait v2.0',
    resolutions: ['1536pro'],
    supportsStaged: false,
  },
  'scene-portraitv2.1': {
    label: 'Portrait v2.1 (Latest)',
    resolutions: ['1536pro'],
    supportsStaged: false,
  },
};

export const RES_DEFAULTS: Record<Hitem3DResolution, number> = {
  '512': 500_000,
  '1024': 1_000_000,
  '1536': 2_000_000,
  '1536pro': 2_000_000,
};

export type Hitem3DTaskStatus = 'created' | 'queueing' | 'processing' | 'success' | 'failed';

export interface Hitem3DTaskResult {
  task_id: string;
  status: Hitem3DTaskStatus;
  url?: string;
  cover_url?: string;
  progress?: number;
  error?: string;
}

export interface Hitem3DSubmitParams {
  request_type: Hitem3DRequestType;
  model: Hitem3DModel;
  resolution?: Hitem3DResolution;
  face?: number;
  format?: Hitem3DFormat;
  mesh_url?: string;
}

/* ── API Calls ──────────────────────────────────────────────────── */

export async function submitTask(
  params: Hitem3DSubmitParams,
  singleImage?: { base64: string; mimeType: string },
  multiImages?: Array<{ base64: string; mimeType: string; viewKey: string }>,
): Promise<string> {
  const body: Record<string, unknown> = {
    action: 'submit-task',
    ...params,
  };

  if (multiImages && multiImages.length > 0) {
    const VIEW_SLOT_ORDER = ['front', 'back', 'left', 'right'] as const;
    const VIEW_ALIAS: Record<string, string> = {
      front: 'front', back: 'back', left: 'left', right: 'right',
      side: 'left', top: 'front',
    };

    const mapped = multiImages.map((img) => ({
      ...img,
      slot: VIEW_ALIAS[img.viewKey] ?? img.viewKey,
    }));

    const slotBuckets = new Map<string, typeof mapped[number]>();
    for (const img of mapped) {
      if (!slotBuckets.has(img.slot)) slotBuckets.set(img.slot, img);
    }

    const orderedImages: typeof mapped = [];
    const bitChars: string[] = [];
    for (const slot of VIEW_SLOT_ORDER) {
      const img = slotBuckets.get(slot);
      if (img) {
        orderedImages.push(img);
        bitChars.push('1');
      } else {
        bitChars.push('0');
      }
    }

    body.multi_images = orderedImages.map((img, i) => ({
      base64: img.base64,
      mimeType: img.mimeType,
      name: `view_${i}.${img.mimeType.split('/')[1] || 'png'}`,
    }));
    body.multi_images_bit = bitChars.join('');
  } else if (singleImage) {
    body.images = {
      base64: singleImage.base64,
      mimeType: singleImage.mimeType,
      name: `input.${singleImage.mimeType.split('/')[1] || 'png'}`,
    };
  }

  const res = await fetch('/api/hitem3d', {
    method: 'POST',
    headers: hitemHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Hitem3D submit error ${res.status}`);

  const taskId = (json as Record<string, unknown>).task_id as string
    ?? (json as Record<string, unknown>).data?.toString();
  if (!taskId) throw new Error('No task_id in response: ' + JSON.stringify(json));
  return taskId;
}

export async function queryTask(taskId: string): Promise<Hitem3DTaskResult> {
  const res = await fetch('/api/hitem3d', {
    method: 'POST',
    headers: hitemHeaders(),
    body: JSON.stringify({ action: 'query-task', task_id: taskId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Hitem3D query error ${res.status}`);
  const data = (json as Record<string, unknown>).data ?? json;
  return data as Hitem3DTaskResult;
}

export async function proxyModelDownload(remoteUrl: string): Promise<string> {
  const res = await fetch('/api/hitem3d', {
    method: 'POST',
    headers: hitemHeaders(),
    body: JSON.stringify({ action: 'proxy-model', url: remoteUrl }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Model proxy failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

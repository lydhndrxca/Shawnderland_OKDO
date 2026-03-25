import { getGlobalSettings } from '@/lib/globalSettings';

export async function autoSaveModel(
  modelUrl: string,
  modelName: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const settings = getGlobalSettings();
  const outputDir = settings.threeDExportDir || settings.outputDir;
  if (!outputDir) return { ok: false, error: 'No output directory configured' };

  try {
    const res = await fetch('/api/model-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: modelUrl,
        outputDir,
        appKey: 'prop-lab',
        contentType: 'models',
        modelName,
        metadata,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || `Save failed (${res.status})` };
    }

    const data = await res.json();
    return { ok: true, path: data.path };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

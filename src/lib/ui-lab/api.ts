const BASE = "/api/tools/ui-lab";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`/api/tools/ui-lab/health`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generate(
  prompt: string,
  style: string,
  dimensions: string,
): Promise<{ image: string; model?: string }> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, style, dimensions }),
  });
  return handleResponse(res);
}

export async function generateWithRefs(opts: {
  prompt: string;
  style?: string;
  dimensions?: string;
  mode?: string;
  styleGuidance?: string;
  styleRef?: File;
  refA?: File;
  refB?: File;
  refC?: File;
}): Promise<{ image: string; model?: string }> {
  const fd = new FormData();
  fd.append("prompt", opts.prompt);
  if (opts.style) fd.append("style", opts.style);
  if (opts.dimensions) fd.append("dimensions", opts.dimensions);
  if (opts.mode) fd.append("mode", opts.mode);
  if (opts.styleGuidance) fd.append("style_guidance", opts.styleGuidance);
  if (opts.styleRef) fd.append("style_ref", opts.styleRef);
  if (opts.refA) fd.append("ref_a", opts.refA);
  if (opts.refB) fd.append("ref_b", opts.refB);
  if (opts.refC) fd.append("ref_c", opts.refC);

  const res = await fetch(`${BASE}/generate-with-refs`, {
    method: "POST",
    body: fd,
  });
  return handleResponse(res);
}

export async function extractSpec(file: File): Promise<Record<string, unknown>> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/extract-spec`, { method: "POST", body: fd });
  return handleResponse(res);
}

export async function extractAttributes(file: File): Promise<{ attributes: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/extract-attributes`, { method: "POST", body: fd });
  return handleResponse(res);
}

export async function removeUI(file: File): Promise<{ image: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/remove-ui`, { method: "POST", body: fd });
  return handleResponse(res);
}

export async function outfill(
  file: File,
  canvasW: number,
  canvasH: number,
): Promise<{ image: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("canvas_w", String(canvasW));
  fd.append("canvas_h", String(canvasH));
  const res = await fetch(`${BASE}/outfill`, { method: "POST", body: fd });
  return handleResponse(res);
}

export async function extractElement(
  file: File,
  elementType: string,
  width: number,
  height: number,
): Promise<{ image: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("element_type", elementType);
  fd.append("width", String(width));
  fd.append("height", String(height));
  const res = await fetch(`${BASE}/extract-element`, { method: "POST", body: fd });
  return handleResponse(res);
}

export async function listStyles(): Promise<{
  folders: { name: string; guidance: string; image_count: number }[];
}> {
  const res = await fetch(`${BASE}/styles`);
  return handleResponse(res);
}

export async function getStyleImages(folder: string): Promise<{
  folder: string;
  guidance: string;
  images: { name: string; thumbnail: string }[];
}> {
  const res = await fetch(`${BASE}/styles/${encodeURIComponent(folder)}/images`);
  return handleResponse(res);
}

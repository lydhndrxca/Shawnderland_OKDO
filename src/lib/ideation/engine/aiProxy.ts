/**
 * Client-side helper for calling Google AI models through the server-side proxy.
 * All calls route through /api/ai-generate to keep API keys server-side
 * and avoid browser-level issues (CORS, extensions, ad blockers).
 */

import { getGlobalSettings } from '@/lib/globalSettings';

const PROXY_URL = '/api/ai-generate';

function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const key = getGlobalSettings().geminiApiKey;
  if (key) h['x-api-key'] = key;
  return h;
}

export async function proxyGenerate(
  model: string,
  method: string,
  body: Record<string, unknown>,
  timeoutMs: number = 120_000,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ model, method, body }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((errBody as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function proxyPollOperation(
  operationName: string,
  timeoutMs: number = 10_000,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${PROXY_URL}?` + new URLSearchParams({ poll: operationName }), {
      headers: apiHeaders(),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(
      `Poll error: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((errBody as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json();
}

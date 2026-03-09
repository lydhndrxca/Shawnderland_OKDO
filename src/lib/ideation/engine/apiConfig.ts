/* ──────────────────────────────────────────────────────
   Dual-Backend API Configuration
   Supports AI Studio and Vertex AI for all Google AI calls.

   AI Studio (default — requires only an API key):
     NEXT_PUBLIC_GEMINI_API_KEY=your-key

   Vertex AI (optional — unlocks region-specific endpoints
   and models not yet on AI Studio):
     NEXT_PUBLIC_VERTEX_PROJECT=your-gcp-project-id
     NEXT_PUBLIC_VERTEX_LOCATION=us-central1       (or any supported region)
     NEXT_PUBLIC_VERTEX_API_KEY=your-vertex-api-key
   ────────────────────────────────────────────────────── */

export type ApiBackend = 'ai-studio' | 'vertex';

export interface BackendConfig {
  backend: ApiBackend;
  apiKey: string;
  project?: string;
  location?: string;
}

let _cachedConfig: BackendConfig | null = null;

export function getBackendConfig(): BackendConfig {
  if (_cachedConfig) return _cachedConfig;

  const vertexProject = process.env.NEXT_PUBLIC_VERTEX_PROJECT;
  const vertexLocation = process.env.NEXT_PUBLIC_VERTEX_LOCATION;
  const vertexKey = process.env.NEXT_PUBLIC_VERTEX_API_KEY;

  if (vertexProject && vertexLocation && vertexKey) {
    _cachedConfig = {
      backend: 'vertex',
      apiKey: vertexKey,
      project: vertexProject,
      location: vertexLocation,
    };
    return _cachedConfig;
  }

  const aiStudioKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (aiStudioKey) {
    _cachedConfig = { backend: 'ai-studio', apiKey: aiStudioKey };
    return _cachedConfig;
  }

  throw new Error(
    'No API key configured. Set GEMINI_API_KEY (or NEXT_PUBLIC_GEMINI_API_KEY) in .env.local, ' +
    'or NEXT_PUBLIC_VERTEX_PROJECT + NEXT_PUBLIC_VERTEX_LOCATION + NEXT_PUBLIC_VERTEX_API_KEY for Vertex AI.',
  );
}

export function getActiveBackend(): ApiBackend {
  try {
    return getBackendConfig().backend;
  } catch {
    return 'ai-studio';
  }
}

export function getApiKey(): string {
  return getBackendConfig().apiKey;
}

/**
 * Build a fully-qualified URL for a Google AI model endpoint.
 * Automatically routes to Vertex AI or AI Studio based on env config.
 */
export function buildModelUrl(
  modelId: string,
  method: 'generateContent' | 'streamGenerateContent' | 'predict' | 'predictLongRunning',
): string {
  const cfg = getBackendConfig();

  if (cfg.backend === 'vertex') {
    return (
      `https://${cfg.location}-aiplatform.googleapis.com/v1/projects/${cfg.project}` +
      `/locations/${cfg.location}/publishers/google/models/${modelId}:${method}?key=${cfg.apiKey}`
    );
  }

  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:${method}?key=${cfg.apiKey}`;
}

/**
 * Build a URL for polling long-running operations (e.g. Veo video generation).
 * On Vertex AI these live under a different base; on AI Studio they use the same domain.
 */
export function buildOperationUrl(operationName: string): string {
  const cfg = getBackendConfig();

  if (cfg.backend === 'vertex') {
    return (
      `https://${cfg.location}-aiplatform.googleapis.com/v1/${operationName}?key=${cfg.apiKey}`
    );
  }

  return `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${cfg.apiKey}`;
}

/** Returns the hostname(s) that the current backend will contact (for allowlist checks). */
export function getActiveHosts(): string[] {
  const cfg = getBackendConfig();

  if (cfg.backend === 'vertex') {
    return [`${cfg.location}-aiplatform.googleapis.com`];
  }

  return ['generativelanguage.googleapis.com'];
}

export const ALLOWED_STAGES = [
  'seed', 'normalize', 'diverge', 'critique-salvage',
  'expand', 'converge', 'commit', 'iterate',
] as const;

export const ALLOWED_PROVIDERS = ['mock', 'gemini'] as const;

export const ALLOWED_PROVIDER_HOSTS = [
  'generativelanguage.googleapis.com',
] as const;

export function isAllowedStage(stage: string): boolean {
  return (ALLOWED_STAGES as readonly string[]).includes(stage);
}

export function isAllowedProvider(provider: string): boolean {
  return (ALLOWED_PROVIDERS as readonly string[]).includes(provider);
}

export function isAllowedProviderHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (ALLOWED_PROVIDER_HOSTS as readonly string[]).includes(host);
  } catch {
    return false;
  }
}

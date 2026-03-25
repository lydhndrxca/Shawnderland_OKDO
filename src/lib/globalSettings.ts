/**
 * Global settings store backed by localStorage.
 * Provides both plain functions (for non-React code like API callers)
 * and a React hook via useSyncExternalStore.
 */

import { useSyncExternalStore } from 'react';

export interface GlobalSettings {
  outputDir: string;
  threeDExportDir: string;
  ue5ProjectPath: string;
  geminiApiKey: string;
  meshyApiKey: string;
  hitem3dAccessKey: string;
  hitem3dSecretKey: string;
  elevenLabsApiKey: string;
  blenderPath: string;
}

const STORAGE_KEY = 'shawnderland-global-settings';

const DEFAULTS: GlobalSettings = {
  outputDir: '',
  threeDExportDir: '',
  ue5ProjectPath: '',
  geminiApiKey: '',
  meshyApiKey: '',
  hitem3dAccessKey: '',
  hitem3dSecretKey: '',
  elevenLabsApiKey: '',
  blenderPath: '',
};

const listeners = new Set<() => void>();
let cached: GlobalSettings | null = null;

function notify() {
  cached = null;
  for (const fn of listeners) fn();
}

export function getGlobalSettings(): GlobalSettings {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: GlobalSettings = { ...DEFAULTS, ...JSON.parse(raw) };
      cached = parsed;
      return parsed;
    }
  } catch { /* corrupt data */ }
  const fallback: GlobalSettings = { ...DEFAULTS };
  cached = fallback;
  return fallback;
}

export function setGlobalSettings(partial: Partial<GlobalSettings>): void {
  const current = getGlobalSettings();
  const next = { ...current, ...partial };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota or private browsing */ }
  notify();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): GlobalSettings {
  return getGlobalSettings();
}

export function useGlobalSettings(): GlobalSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

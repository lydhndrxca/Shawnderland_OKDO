"use client";

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
  guidance: string;
  thumbnailDataUrl?: string;
  createdAt: number;
}

const STORAGE_KEY = 'shawnderland-style-store';

function loadFromStorage(): StylePreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(presets: StylePreset[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* quota exceeded — silently skip */
  }
}

export function getAllStyles(): StylePreset[] {
  return loadFromStorage();
}

export function getStyleById(id: string): StylePreset | undefined {
  return loadFromStorage().find((s) => s.id === id);
}

export function saveStyle(preset: Omit<StylePreset, 'id' | 'createdAt'>): StylePreset {
  const all = loadFromStorage();
  const newPreset: StylePreset = {
    ...preset,
    id: `style-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  all.unshift(newPreset);
  saveToStorage(all);
  return newPreset;
}

export function updateStyle(id: string, updates: Partial<Omit<StylePreset, 'id' | 'createdAt'>>): boolean {
  const all = loadFromStorage();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  all[idx] = { ...all[idx], ...updates };
  saveToStorage(all);
  return true;
}

export function deleteStyle(id: string): boolean {
  const all = loadFromStorage();
  const filtered = all.filter((s) => s.id !== id);
  if (filtered.length === all.length) return false;
  saveToStorage(filtered);
  return true;
}

export function exportStyles(): string {
  return JSON.stringify(loadFromStorage(), null, 2);
}

export function importStyles(json: string): number {
  try {
    const incoming = JSON.parse(json) as StylePreset[];
    if (!Array.isArray(incoming)) return 0;
    const existing = loadFromStorage();
    const existingIds = new Set(existing.map((s) => s.id));
    const newStyles = incoming.filter((s) => s.id && s.name && !existingIds.has(s.id));
    if (newStyles.length === 0) return 0;
    saveToStorage([...newStyles, ...existing]);
    return newStyles.length;
  } catch {
    return 0;
  }
}

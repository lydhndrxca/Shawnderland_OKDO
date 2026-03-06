"use client";

export interface NodePreset {
  name: string;
  description: string;
  nodeType: string;
  data: Record<string, unknown>;
  savedAt: string;
}

const STORAGE_PREFIX = 'shawndermind-presets-';

function storageKey(nodeType: string): string {
  return `${STORAGE_PREFIX}${nodeType}`;
}

function autoDescription(nodeType: string, data: Record<string, unknown>): string {
  const seed = data.prefillSeed || data.seedText;
  if (typeof seed === 'string' && seed.trim()) return seed.slice(0, 60);
  const influence = data.influenceText;
  if (typeof influence === 'string' && influence.trim()) return influence.slice(0, 60);
  const custom = data.customInstructions;
  if (typeof custom === 'string' && custom.trim()) return custom.slice(0, 60);
  const subName = data.subName;
  if (typeof subName === 'string' && subName.trim()) return subName;
  return `${nodeType} preset`;
}

export function savePreset(nodeType: string, name: string, data: Record<string, unknown>): NodePreset {
  const preset: NodePreset = {
    name,
    description: autoDescription(nodeType, data),
    nodeType,
    data: { ...data },
    savedAt: new Date().toISOString(),
  };

  const existing = loadPresets(nodeType);
  const idx = existing.findIndex((p) => p.name === name);
  if (idx >= 0) {
    existing[idx] = preset;
  } else {
    existing.push(preset);
  }

  try {
    localStorage.setItem(storageKey(nodeType), JSON.stringify(existing));
  } catch {
    // storage full or unavailable
  }
  return preset;
}

export function loadPresets(nodeType: string): NodePreset[] {
  try {
    const raw = localStorage.getItem(storageKey(nodeType));
    if (!raw) return [];
    return JSON.parse(raw) as NodePreset[];
  } catch {
    return [];
  }
}

export function deletePreset(nodeType: string, name: string): void {
  const existing = loadPresets(nodeType);
  const filtered = existing.filter((p) => p.name !== name);
  try {
    localStorage.setItem(storageKey(nodeType), JSON.stringify(filtered));
  } catch {
    // storage full or unavailable
  }
}

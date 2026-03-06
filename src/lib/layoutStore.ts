/**
 * Named layout persistence layer backed by localStorage.
 * Each app (concept-lab, shawndermind, gemini-studio, tool-editor) keeps
 * its own list of saved layouts plus a "default" marker.
 */

export interface LayoutSnapshot {
  nodes: Array<{ id: string; position: { x: number; y: number }; type?: string; style?: Record<string, unknown> }>;
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>;
  nodeData?: Record<string, Record<string, unknown>>;
  viewport?: { x: number; y: number; zoom: number };
}

export interface SavedLayout {
  name: string;
  snapshot: LayoutSnapshot;
  savedAt: string;
}

function storageKey(appKey: string): string {
  return `shawnderland-layouts-${appKey}`;
}

function defaultKey(appKey: string): string {
  return `shawnderland-default-layout-${appKey}`;
}

export function listLayouts(appKey: string): SavedLayout[] {
  try {
    const raw = localStorage.getItem(storageKey(appKey));
    if (!raw) return [];
    return JSON.parse(raw) as SavedLayout[];
  } catch {
    return [];
  }
}

export function saveNamedLayout(appKey: string, name: string, snapshot: LayoutSnapshot): void {
  const layouts = listLayouts(appKey);
  const existing = layouts.findIndex((l) => l.name === name);
  const entry: SavedLayout = { name, snapshot, savedAt: new Date().toISOString() };
  if (existing >= 0) {
    layouts[existing] = entry;
  } else {
    layouts.push(entry);
  }
  localStorage.setItem(storageKey(appKey), JSON.stringify(layouts));
}

export function loadNamedLayout(appKey: string, name: string): LayoutSnapshot | null {
  const layouts = listLayouts(appKey);
  const found = layouts.find((l) => l.name === name);
  return found?.snapshot ?? null;
}

export function deleteNamedLayout(appKey: string, name: string): void {
  const layouts = listLayouts(appKey).filter((l) => l.name !== name);
  localStorage.setItem(storageKey(appKey), JSON.stringify(layouts));
  const def = getDefaultLayoutName(appKey);
  if (def === name) {
    localStorage.removeItem(defaultKey(appKey));
  }
}

export function setDefaultLayout(appKey: string, name: string): void {
  localStorage.setItem(defaultKey(appKey), name);
}

export function setDefaultFromSnapshot(appKey: string, snapshot: LayoutSnapshot): void {
  const autoName = '__default__';
  saveNamedLayout(appKey, autoName, snapshot);
  setDefaultLayout(appKey, autoName);
}

export function getDefaultLayoutName(appKey: string): string | null {
  return localStorage.getItem(defaultKey(appKey)) ?? null;
}

export function loadDefaultOrLatest(appKey: string): LayoutSnapshot | null {
  const defName = getDefaultLayoutName(appKey);
  if (defName) {
    const snap = loadNamedLayout(appKey, defName);
    if (snap) return snap;
  }
  const layouts = listLayouts(appKey);
  if (layouts.length === 0) return null;
  const sorted = [...layouts].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
  return sorted[0].snapshot;
}

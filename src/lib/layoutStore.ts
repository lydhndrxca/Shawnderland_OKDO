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

// ── Session persistence (IndexedDB – supports large payloads) ───

export interface SessionSnapshot extends LayoutSnapshot {
  fullNodeData: Record<string, Record<string, unknown>>;
}

export interface SavedSession {
  name: string;
  snapshot: SessionSnapshot;
  savedAt: string;
}

const IDB_NAME = 'shawnderland-sessions';
const IDB_VERSION = 1;
const IDB_STORE = 'sessions';

function openSessionDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbKey(appKey: string): string {
  return `sessions-${appKey}`;
}

function activeSessionKey(appKey: string): string {
  return `shawnderland-active-session-${appKey}`;
}

export async function listSessions(appKey: string): Promise<SavedSession[]> {
  try {
    const db = await openSessionDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(idbKey(appKey));
      req.onsuccess = () => resolve((req.result as SavedSession[] | undefined) ?? []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveSession(appKey: string, name: string, snapshot: SessionSnapshot): Promise<{ ok: boolean; error?: string }> {
  try {
    const sessions = await listSessions(appKey);
    const existing = sessions.findIndex((s) => s.name === name);
    const entry: SavedSession = { name, snapshot, savedAt: new Date().toISOString() };
    if (existing >= 0) {
      sessions[existing] = entry;
    } else {
      sessions.push(entry);
    }

    const db = await openSessionDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(sessions, idbKey(appKey));
      tx.oncomplete = () => {
        localStorage.setItem(activeSessionKey(appKey), name);
        resolve({ ok: true });
      };
      tx.onerror = () => resolve({ ok: false, error: tx.error?.message ?? 'IndexedDB write failed' });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function loadSession(appKey: string, name: string): Promise<SessionSnapshot | null> {
  const sessions = await listSessions(appKey);
  const found = sessions.find((s) => s.name === name);
  return found?.snapshot ?? null;
}

export async function deleteSession(appKey: string, name: string): Promise<void> {
  try {
    const sessions = (await listSessions(appKey)).filter((s) => s.name !== name);
    const db = await openSessionDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(sessions, idbKey(appKey));
    const active = getActiveSessionName(appKey);
    if (active === name) {
      localStorage.removeItem(activeSessionKey(appKey));
    }
  } catch { /* best-effort */ }
}

export function getActiveSessionName(appKey: string): string | null {
  return localStorage.getItem(activeSessionKey(appKey)) ?? null;
}

export function setActiveSessionName(appKey: string, name: string): void {
  localStorage.setItem(activeSessionKey(appKey), name);
}

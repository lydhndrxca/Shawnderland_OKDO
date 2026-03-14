/**
 * IndexedDB-backed storage for saved context hub presets.
 * Each preset captures all context node data (Bible, Costume Director,
 * Style Fusion, Environment, Preservation Lock) along with hub toggles.
 */

export interface ContextNodeSnapshot {
  type: string;
  data: Record<string, unknown>;
}

export interface ContextPreset {
  id: string;
  name: string;
  hubToggles: Record<string, boolean>;
  nodes: ContextNodeSnapshot[];
  savedAt: string;
}

const IDB_NAME = 'shawnderland-context-presets';
const IDB_VERSION = 1;
const IDB_STORE = 'presets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveContextPreset(preset: ContextPreset): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(preset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listContextPresets(): Promise<ContextPreset[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => {
        const results = (req.result as ContextPreset[]) ?? [];
        results.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        resolve(results);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function loadContextPreset(id: string): Promise<ContextPreset | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = () => resolve((req.result as ContextPreset) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteContextPreset(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const CONTEXT_NODE_TYPES = new Set([
  'charBible', 'charPreservationLock', 'costumeDirector', 'charStyleFusion', 'envPlacement',
]);

/**
 * Traverse upstream from a context hub node and snapshot all connected context nodes.
 */
export function gatherContextSnapshot(
  hubId: string,
  getNode: (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
  getEdges: () => Array<{ source: string; target: string }>,
): ContextNodeSnapshot[] {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === hubId);
  const snapshots: ContextNodeSnapshot[] = [];

  for (const e of incoming) {
    const node = getNode(e.source);
    if (!node?.type || !CONTEXT_NODE_TYPES.has(node.type)) continue;

    const d = node.data as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d)) {
      if (k.startsWith('_')) continue;
      clean[k] = v;
    }
    snapshots.push({ type: node.type, data: clean });
  }

  return snapshots;
}

/**
 * Restore context node data from a preset to connected nodes.
 */
export function restoreContextSnapshot(
  hubId: string,
  snapshots: ContextNodeSnapshot[],
  getNode: (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
  getEdges: () => Array<{ source: string; target: string }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setNodes: (updater: (nodes: any[]) => any[]) => void,
): number {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === hubId);
  let restored = 0;

  const snapshotByType = new Map<string, Record<string, unknown>>();
  for (const snap of snapshots) {
    snapshotByType.set(snap.type, snap.data);
  }

  const targetIds: Map<string, Record<string, unknown>> = new Map();
  for (const e of incoming) {
    const node = getNode(e.source);
    if (!node?.type || !CONTEXT_NODE_TYPES.has(node.type)) continue;
    const snapData = snapshotByType.get(node.type);
    if (snapData) {
      targetIds.set(node.id, snapData);
      restored++;
    }
  }

  if (targetIds.size > 0) {
    setNodes((nds) =>
      nds.map((n) => {
        const snapData = targetIds.get(n.id);
        if (!snapData) return n;
        return { ...n, data: { ...n.data, ...snapData } };
      }),
    );
  }

  return restored;
}

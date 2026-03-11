/**
 * IndexedDB-backed storage for saved image groups.
 * Each group contains one or more images captured from canvas nodes
 * and is organized by application key (e.g. "concept-lab").
 */

export interface SavedImage {
  viewName: string;
  base64: string;
  mimeType: string;
  nodeLabel?: string;
}

export interface SavedGroup {
  id: string;
  name: string;
  appKey: string;
  images: SavedImage[];
  namingPattern?: string;
  createdAt: string;
  thumbnailBase64?: string;
}

const IDB_NAME = 'shawnderland-files';
const IDB_VERSION = 1;
const IDB_STORE = 'savedGroups';

function openFilesDB(): Promise<IDBDatabase> {
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

export async function saveGroup(group: SavedGroup): Promise<void> {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(group);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listGroups(appKey?: string): Promise<SavedGroup[]> {
  try {
    const db = await openFilesDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => {
        let results = (req.result as SavedGroup[]) ?? [];
        if (appKey) results = results.filter((g) => g.appKey === appKey);
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getGroup(id: string): Promise<SavedGroup | null> {
  try {
    const db = await openFilesDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = () => resolve((req.result as SavedGroup) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteGroup(id: string): Promise<void> {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateGroup(id: string, partial: Partial<Omit<SavedGroup, 'id'>>): Promise<void> {
  const existing = await getGroup(id);
  if (!existing) return;
  const updated = { ...existing, ...partial };
  await saveGroup(updated);
}

/**
 * Generate a downscaled thumbnail (max 200px on longest side) from a base64 image.
 */
export function generateThumbnail(base64: string, mimeType: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 200;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      resolve(thumbDataUrl.split(',')[1] ?? base64);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/**
 * Apply a naming pattern to produce a filename.
 * Tokens: {name} = group name, {view} = view name, {###} = zero-padded index
 */
export function applyNamingPattern(pattern: string, groupName: string, viewName: string, index: number): string {
  let result = pattern;
  result = result.replace(/\{name\}/gi, groupName.replace(/[^a-zA-Z0-9_-]/g, '_'));
  result = result.replace(/\{view\}/gi, viewName.replace(/[^a-zA-Z0-9_-]/g, '_'));
  result = result.replace(/\{###\}/g, String(index).padStart(3, '0'));
  result = result.replace(/\{##\}/g, String(index).padStart(2, '0'));
  result = result.replace(/\{#\}/g, String(index));
  return result;
}

/**
 * IndexedDB-backed storage for saved style presets.
 * Each preset contains reference images and optional style text,
 * and appears in the sidebar Files panel under "Styles".
 */

export interface SavedStyleImage {
  base64: string;
  mimeType: string;
}

export interface SavedStyle {
  id: string;
  name: string;
  styleText: string;
  images: SavedStyleImage[];
  createdAt: string;
  updatedAt: string;
}

const IDB_NAME = 'shawnderland-styles';
const IDB_VERSION = 1;
const IDB_STORE = 'styles';

function openStyleDB(): Promise<IDBDatabase> {
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

export async function saveStyle(style: SavedStyle): Promise<void> {
  const db = await openStyleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(style);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listStyles(): Promise<SavedStyle[]> {
  try {
    const db = await openStyleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => {
        const results = (req.result as SavedStyle[]) ?? [];
        results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(results);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getStyle(id: string): Promise<SavedStyle | null> {
  try {
    const db = await openStyleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = () => resolve((req.result as SavedStyle) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteStyle(id: string): Promise<void> {
  const db = await openStyleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

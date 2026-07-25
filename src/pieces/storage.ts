/**
 * Speicherung der Figurengestaltung im Browser.
 *
 * IndexedDB statt localStorage, weil Fotos als Data-URLs schnell mehrere
 * Megabyte belegen und localStorage typischerweise bei 5 MB dichtmacht.
 * Schlägt der Speicher fehl, läuft das Spiel trotzdem — dann eben ohne
 * Persistenz.
 */

import { DesignSet, defaultDesignSet } from './design';

const DB_NAME = 'chess-figuren';
const DB_VERSION = 1;
const STORE = 'state';
const KEY = 'designs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadDesigns(): Promise<DesignSet> {
  try {
    const db = await openDatabase();
    const stored = await new Promise<DesignSet | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result as DesignSet | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return stored ? migrate(stored) : defaultDesignSet();
  } catch {
    return defaultDesignSet();
  }
}

export async function saveDesigns(set: DesignSet): Promise<boolean> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(set, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function clearDesigns(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // Ohne Speicher ist nichts zu löschen.
  }
}

/** Ergänzt fehlende Felder, damit ältere Stände nicht die App zerlegen. */
function migrate(stored: DesignSet): DesignSet {
  const fallback = defaultDesignSet();
  if (!stored || typeof stored !== 'object') return fallback;
  const merged: DesignSet = {
    images: stored.images ?? {},
    players: [fallback.players[0], fallback.players[1]],
  };
  for (let color = 0; color < 2; color++) {
    const source = stored.players?.[color];
    if (!source) continue;
    merged.players[color].name = source.name ?? merged.players[color].name;
    for (const type of Object.keys(merged.players[color].pieces).map(Number)) {
      const design = source.pieces?.[type as 1];
      if (design) {
        merged.players[color].pieces[type as 1] = {
          imageId: design.imageId ?? null,
          transform: {
            scale: design.transform?.scale ?? 1,
            dx: design.transform?.dx ?? 0,
            dy: design.transform?.dy ?? 0,
            rotate: design.transform?.rotate ?? 0,
          },
        };
      }
    }
  }
  return merged;
}

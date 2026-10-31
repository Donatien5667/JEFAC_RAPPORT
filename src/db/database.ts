import type { AppState } from "@/lib/types";

const NAME = "jefac-rapports-db";
const KEY = "application";
const FALLBACK = "jefac-rapports-v3";
let connection: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (connection) return connection;
  connection = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(NAME, 1);
      request.onupgradeneeded = () => {
        for (const name of ["etat", "comptes", "journal"]) {
          if (!request.result.objectStoreNames.contains(name))
            request.result.createObjectStore(
              name,
              name === "etat" ? undefined : { keyPath: "id" },
            );
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return connection;
}

function cached(): AppState | null {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK) || "null");
  } catch {
    return null;
  }
}
export async function chargerEtat(): Promise<AppState | null> {
  try {
    if (localStorage.getItem("jefac-storage-mode") === "fallback")
      return cached();
    const db = await open();
    if (!db) return cached();
    return await new Promise<AppState | null>((resolve, reject) => {
      const request = db
        .transaction("etat", "readonly")
        .objectStore("etat")
        .get(KEY);
      request.onsuccess = () => resolve(request.result || cached());
      request.onerror = () => reject(request.error);
    });
  } catch {
    return cached();
  }
}

export async function sauverEtat(state: AppState): Promise<void> {
  const serialized = JSON.stringify(state);
  let fallbackOk = false;
  try {
    localStorage.setItem(FALLBACK, serialized);
    fallbackOk = true;
  } catch {
    /* IndexedDB can still save larger photos. */
  }
  try {
    const db = await open();
    if (!db) throw new Error("IndexedDB indisponible");
    await new Promise<void>((resolve, reject) => {
      // Commit records and the snapshot together, including removals.
      const tx = db.transaction(["etat", "comptes", "journal"], "readwrite");
      tx.objectStore("etat").put(state, KEY);
      const accounts = tx.objectStore("comptes");
      accounts.clear();
      for (const user of state.utilisateurs) accounts.put(user);
      const journal = tx.objectStore("journal");
      journal.clear();
      for (const entry of state.journal) journal.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    try {
      localStorage.setItem("jefac-storage-mode", "indexeddb");
      localStorage.removeItem(`${NAME}-comptes`);
    } catch {
      /* Saved in IndexedDB. */
    }
  } catch {
    if (!fallbackOk)
      throw new Error(
        "Le stockage de cet appareil est plein ou indisponible. Les modifications n'ont pas été enregistrées.",
      );
    localStorage.setItem("jefac-storage-mode", "fallback");
  }
}

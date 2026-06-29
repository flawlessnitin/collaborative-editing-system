import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "sync-outbox";
const DB_VERSION = 2;
const STORE_NAME = "updates";
const DOCUMENT_ID_INDEX = "documentId";

export interface QueuedUpdate {
  id: number;
  documentId: string;
  update: Uint8Array;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        // On a fresh install there's no existing store yet — create it.
        // On an upgrade from v1, the store already exists; we get a handle
        // to it via the upgrade transaction instead of creating a new one.
        const store = db.objectStoreNames.contains(STORE_NAME)
          ? transaction.objectStore(STORE_NAME)
          : db.createObjectStore(STORE_NAME, {
              keyPath: "id",
              autoIncrement: true,
            });

        if (!store.indexNames.contains(DOCUMENT_ID_INDEX)) {
          store.createIndex(DOCUMENT_ID_INDEX, DOCUMENT_ID_INDEX);
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueUpdate(
  documentId: string,
  update: Uint8Array,
): Promise<void> {
  const db = await getDb();
  await db.add(STORE_NAME, {
    documentId,
    update,
    createdAt: Date.now(),
  });
}

export async function getQueuedUpdates(
  documentId: string,
): Promise<QueuedUpdate[]> {
  const db = await getDb();
  return db.getAllFromIndex(STORE_NAME, DOCUMENT_ID_INDEX, documentId);
}

export async function removeQueuedUpdates(ids: number[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

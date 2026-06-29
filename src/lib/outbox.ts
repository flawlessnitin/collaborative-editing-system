import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "sync-outbox";
const DB_VERSION = 1;
const STORE_NAME = "updates";

export interface QueuedUpdate {
  id: number;
  update: Uint8Array;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() { 
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      },
    });
  }
  return dbPromise;
}

export async function enqueueUpdate(update: Uint8Array): Promise<void> {
  const db = await getDb();
  await db.add(STORE_NAME, {
    update,
    createdAt: Date.now(),
  });
}

export async function getQueuedUpdates(): Promise<QueuedUpdate[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function removeQueuedUpdates(ids: number[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

import * as Y from "yjs";
import { getQueuedUpdates, removeQueuedUpdates } from "@/lib/outbox";

const LAST_SYNCED_SEQ_PREFIX = "lastSyncedSeq";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getLastSyncedSeq(documentId: string): string | null {
  return localStorage.getItem(`${LAST_SYNCED_SEQ_PREFIX}:${documentId}`);
}

function setLastSyncedSeq(documentId: string, seq: string): void {
  localStorage.setItem(`${LAST_SYNCED_SEQ_PREFIX}:${documentId}`, seq);
}

async function pushUpdates(documentId: string): Promise<void> {
  const queued = await getQueuedUpdates(documentId);
  if (queued.length === 0) {
    return;
  }

  const response = await fetch(`/api/documents/${documentId}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      updates: queued.map((entry) => uint8ArrayToBase64(entry.update)),
    }),
  });

  if (!response.ok) {
    throw new Error(`Push failed with status ${response.status}`);
  }

  // Only drop entries from the outbox once the server has actually
  // acknowledged them — never clear preemptively.
  await removeQueuedUpdates(queued.map((entry) => entry.id));
}

async function pullUpdates(documentId: string, doc: Y.Doc): Promise<void> {
  const since = getLastSyncedSeq(documentId);
  const url = since
    ? `/api/documents/${documentId}/sync?since=${since}`
    : `/api/documents/${documentId}/sync`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pull failed with status ${response.status}`);
  }

  const { updates, seq }: { updates: string[]; seq: string } = await response.json();

  for (const update of updates) {
    // Tagging the origin as "remote" lets the editor's update listener
    // distinguish "this came from the server" from "the user just typed
    // this" — without it, pulled updates would get re-queued and pushed
    // straight back, looping pointlessly.
    Y.applyUpdate(doc, base64ToUint8Array(update), "remote");
  }

  setLastSyncedSeq(documentId, seq);
}

export async function syncDocument(documentId: string, doc: Y.Doc): Promise<void> {
  await pushUpdates(documentId);
  await pullUpdates(documentId, doc);
}

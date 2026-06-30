import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";

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

export async function syncAwareness(documentId: string, awareness: Awareness): Promise<void> {
  const url = `/api/documents/${documentId}/presence`;
  const localUpdate = encodeAwarenessUpdate(awareness, [awareness.clientID]);

  const pushResponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ awareness: uint8ArrayToBase64(localUpdate) }),
  });

  if (!pushResponse.ok) {
    throw new Error(`Presence/awareness push failed with status ${pushResponse.status}`);
  }

  // The POST only ever returns { success: true } — other users' states come
  // from a separate GET, same push/pull split as the document sync engine.
  const pullResponse = await fetch(url);
  if (!pullResponse.ok) {
    throw new Error(`Presence/awareness pull failed with status ${pullResponse.status}`);
  }

  const { users }: { users: { awareness: string | null }[] } = await pullResponse.json();

  for (const user of users) {
    if (!user.awareness) continue;
    // origin "presence-poll" — distinguishes server-applied remote awareness
    // from local changes, same purpose as the "remote" tag on doc updates.
    applyAwarenessUpdate(awareness, base64ToUint8Array(user.awareness), "presence-poll");
  }
}

import { describe, it, expect, vi, afterEach } from "vitest";
import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { syncAwareness } from "../awareness";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Captures what syncAwareness POSTs and serves canned users on GET.
function mockPresenceApi(pullUsers: { awareness: string | null }[] = []) {
  const posted: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posted.push(JSON.parse(init.body as string).awareness);
        return new Response(JSON.stringify({ success: true }));
      }
      return new Response(JSON.stringify({ users: pullUsers }));
    }),
  );
  return posted;
}

const cleanups: (() => void)[] = [];

function makeAwareness(): Awareness {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  cleanups.push(() => {
    awareness.destroy();
    doc.destroy();
  });
  return awareness;
}

afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.unstubAllGlobals();
});

describe("syncAwareness", () => {
  it("publishes the local user/cursor state so a remote peer can render a caret", async () => {
    const local = makeAwareness();
    local.setLocalStateField("user", { name: "Alice", color: "#ef4444" });
    local.setLocalStateField("cursor", { anchor: {}, head: {} });

    const posted = mockPresenceApi();
    await syncAwareness("doc-1", local);
    expect(posted).toHaveLength(1);

    const receiver = makeAwareness();
    applyAwarenessUpdate(receiver, base64ToUint8Array(posted[0]), "test");

    const received = receiver.getStates().get(local.clientID);
    expect(received?.user).toMatchObject({ name: "Alice", color: "#ef4444" });
    expect(received?.cursor).toBeTruthy();
  });

  it("applies pulled remote states, so remote carets appear locally", async () => {
    const remote = makeAwareness();
    remote.setLocalStateField("user", { name: "Bob", color: "#3b82f6" });
    const remoteUpdate = uint8ArrayToBase64(
      encodeAwarenessUpdate(remote, [remote.clientID]),
    );

    mockPresenceApi([{ awareness: remoteUpdate }, { awareness: null }]);

    const local = makeAwareness();
    await syncAwareness("doc-1", local);

    expect(local.getStates().get(remote.clientID)?.user).toMatchObject({
      name: "Bob",
    });
  });

  it("destroy() poisons an awareness for good — Editor must only destroy on true unmount", async () => {
    // Regression documentation: Editor.tsx used to call awareness.destroy()
    // in an effect cleanup that StrictMode / Fast Refresh replay while the
    // component stays mounted. This is what that does:
    const local = makeAwareness();
    local.setLocalStateField("user", { name: "Alice", color: "#ef4444" });
    local.destroy();

    // Field updates silently no-op on the destroyed instance…
    local.setLocalStateField("user", { name: "Alice", color: "#ef4444" });
    local.setLocalStateField("cursor", { anchor: {}, head: {} });
    expect(local.getLocalState()).toBeNull();

    // …and what it publishes actively removes this client from peers,
    // so no caret or name label can ever render for it again.
    const posted = mockPresenceApi();
    await syncAwareness("doc-1", local);

    const receiver = makeAwareness();
    applyAwarenessUpdate(receiver, base64ToUint8Array(posted[0]), "test");
    expect(receiver.getStates().has(local.clientID)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { mergeUpdatesIntoState, InvalidUpdateError } from "../merge";

function emptyState(): Uint8Array {
  const doc = new Y.Doc();
  const state = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return state;
}

function textContentOf(state: Uint8Array): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  const text = doc.getText("content").toString();
  doc.destroy();
  return text;
}

describe("mergeUpdatesIntoState", () => {
  it("converges to the same content regardless of update order (CRDT commutativity)", () => {
    const base = emptyState();

    // Two independent clients, both starting from the same empty base,
    // editing offline without seeing each other's change.
    const clientA = new Y.Doc();
    Y.applyUpdate(clientA, base);
    clientA.getText("content").insert(0, "Hello");
    const updateA = Y.encodeStateAsUpdate(clientA, base);
    clientA.destroy();

    const clientB = new Y.Doc();
    Y.applyUpdate(clientB, base);
    clientB.getText("content").insert(0, "World");
    const updateB = Y.encodeStateAsUpdate(clientB, base);
    clientB.destroy();

    const mergedAB = mergeUpdatesIntoState(base, [updateA, updateB]);
    const mergedBA = mergeUpdatesIntoState(base, [updateB, updateA]);

    // Same logical content no matter which update was applied first.
    expect(textContentOf(mergedAB.state)).toBe(textContentOf(mergedBA.state));
    // Neither offline edit is lost in the merge.
    expect(textContentOf(mergedAB.state)).toContain("Hello");
    expect(textContentOf(mergedAB.state)).toContain("World");
  });

  it("merging is idempotent when re-applying an already-merged update", () => {
    const base = emptyState();
    const client = new Y.Doc();
    Y.applyUpdate(client, base);
    client.getText("content").insert(0, "Once");
    const update = Y.encodeStateAsUpdate(client, base);
    client.destroy();

    const first = mergeUpdatesIntoState(base, [update]);
    const second = mergeUpdatesIntoState(first.state, [update]);

    expect(textContentOf(second.state)).toBe("Once");
  });

  it("rejects structurally malformed update bytes instead of corrupting state", () => {
    const base = emptyState();
    const garbage = new Uint8Array([255, 255, 255, 255, 255]);

    expect(() => mergeUpdatesIntoState(base, [garbage])).toThrow(InvalidUpdateError);
  });
});

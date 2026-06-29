import * as Y from "yjs";

export class InvalidUpdateError extends Error {}

/**
 * Reconstructs the document from its compacted state, applies each incoming
 * update on top, and returns the new compacted state + state vector.
 *
 * All updates are applied to an in-memory Y.Doc that is never persisted —
 * if any update fails to decode/apply, nothing has been written anywhere,
 * so a rejected batch can't partially corrupt the stored state.
 */
export function mergeUpdatesIntoState(
  currentState: Uint8Array,
  updates: Uint8Array[],
): { state: Uint8Array<ArrayBuffer>; stateVector: Uint8Array<ArrayBuffer> } {
  const doc = new Y.Doc();

  try {
    Y.applyUpdate(doc, currentState);

    for (const update of updates) {
      Y.applyUpdate(doc, update);
    }

    // Wrapped in `new Uint8Array(...)` because Yjs's return type is the
    // looser Uint8Array<ArrayBufferLike>, while Prisma's Bytes fields
    // require the stricter Uint8Array<ArrayBuffer>.
    const state = new Uint8Array(Y.encodeStateAsUpdate(doc));
    const stateVector = new Uint8Array(Y.encodeStateVector(doc));
    return { state, stateVector };
  } catch (error) {
    throw new InvalidUpdateError(
      error instanceof Error ? error.message : "Malformed Yjs update",
    );
  } finally {
    doc.destroy();
  }
}

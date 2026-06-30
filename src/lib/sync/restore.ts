import * as Y from "yjs";

type FragmentChild = Y.XmlElement | Y.XmlText;

// Must match the `field` Collaboration.configure() defaults to in Editor.tsx
// (we don't override it, so Tiptap uses its own default of "default").
const COLLABORATION_FIELD = "default";

/**
 * Computes the edit needed to make the live document's content match an old
 * snapshot's content — NOT a raw overwrite of `currentState`.
 *
 * The result is encoded as a diff against current's own state vector
 * (`beforeRestoreVector`), so it's a normal, ordinary Yjs update — the same
 * shape as any edit a user's keystroke would produce. That's what makes
 * restore safe for concurrent collaborators: it isn't a special-cased
 * operation that bypasses the merge pipeline, it's just another update that
 * flows through the exact same convergence machinery as everything else.
 */
export function computeRestoreUpdate(
  currentState: Uint8Array,
  snapshotState: Uint8Array,
): Uint8Array<ArrayBuffer> {
  const currentDoc = new Y.Doc();
  const snapshotDoc = new Y.Doc();

  try {
    Y.applyUpdate(currentDoc, currentState);
    Y.applyUpdate(snapshotDoc, snapshotState);

    const beforeRestoreVector = Y.encodeStateVector(currentDoc);

    const currentFragment = currentDoc.getXmlFragment(COLLABORATION_FIELD);
    const snapshotFragment = snapshotDoc.getXmlFragment(COLLABORATION_FIELD);

    currentDoc.transact(() => {
      currentFragment.delete(0, currentFragment.length);
      // .clone() deep-copies each item (and its children) into a detached
      // structure with no ties to snapshotDoc — required, since Yjs shared
      // types can't be inserted directly into a different Y.Doc by reference.
      // Cast: toArray()'s type includes YXmlHook, a legacy Yjs construct
      // Tiptap's ProseMirror-based schema never actually produces.
      const clonedContent = snapshotFragment
        .toArray()
        .map((item) => (item instanceof Y.AbstractType ? item.clone() : item)) as FragmentChild[];
      currentFragment.insert(0, clonedContent);
    });

    return new Uint8Array(Y.encodeStateAsUpdate(currentDoc, beforeRestoreVector));
  } finally {
    currentDoc.destroy();
    snapshotDoc.destroy();
  }
}

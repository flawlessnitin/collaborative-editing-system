import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { computeRestoreUpdate } from "../restore";
import { mergeUpdatesIntoState } from "../merge";

const FIELD = "default";

function docWithParagraph(text: string): { doc: Y.Doc; state: Uint8Array } {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment(FIELD);
  const el = new Y.XmlElement("paragraph");
  const t = new Y.XmlText();
  t.insert(0, text);
  el.insert(0, [t]);
  fragment.insert(0, [el]);
  return { doc, state: Y.encodeStateAsUpdate(doc) };
}

function plainTextOf(state: Uint8Array): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  const text = doc
    .getXmlFragment(FIELD)
    .toArray()
    .map((node) => (node instanceof Y.XmlElement ? node.toArray().map(String).join("") : String(node)))
    .join("\n");
  doc.destroy();
  return text;
}

describe("computeRestoreUpdate", () => {
  it("restoring a snapshot reproduces the snapshot's content exactly", () => {
    const snapshot = docWithParagraph("Version A");
    const current = docWithParagraph("Version A edited into Version B");

    const diff = computeRestoreUpdate(current.state, snapshot.state);

    // Apply the diff the same way the sync route would: merge it onto the
    // current state, as if it were just another pushed update.
    const result = mergeUpdatesIntoState(current.state, [diff]);

    expect(plainTextOf(result.state)).toBe("Version A");
  });

  it("a concurrent collaborator's unsynced offline edit still merges cleanly after a restore", () => {
    // Document is at "Version B" when the restore happens.
    const snapshot = docWithParagraph("Version A");
    const atRestoreTime = docWithParagraph("Version B");

    const restoreDiff = computeRestoreUpdate(atRestoreTime.state, snapshot.state);

    // Meanwhile, a collaborator went offline back when the doc still said
    // "Version B" and made their own edit, completely unaware the restore
    // ever happened. Simulate their update as a diff against that same
    // pre-restore state vector.
    const collaboratorDoc = new Y.Doc();
    Y.applyUpdate(collaboratorDoc, atRestoreTime.state);
    const beforeVector = Y.encodeStateVector(collaboratorDoc);
    collaboratorDoc.getXmlFragment(FIELD).toArray(); // no-op touch, content already present
    // Append a second paragraph the collaborator typed while offline.
    const extra = new Y.XmlElement("paragraph");
    const extraText = new Y.XmlText();
    extraText.insert(0, "Offline collaborator note");
    extra.insert(0, [extraText]);
    collaboratorDoc.getXmlFragment(FIELD).insert(1, [extra]);
    const collaboratorDiff = new Uint8Array(Y.encodeStateAsUpdate(collaboratorDoc, beforeVector));
    collaboratorDoc.destroy();

    // Server applies the restore first, then later receives the
    // collaborator's late, independently-derived push. Neither operation
    // should throw, and nothing should be silently dropped.
    const afterRestore = mergeUpdatesIntoState(atRestoreTime.state, [restoreDiff]);
    const afterCollaboratorPush = mergeUpdatesIntoState(afterRestore.state, [collaboratorDiff]);

    const finalText = plainTextOf(afterCollaboratorPush.state);
    expect(finalText).toContain("Version A");
    expect(finalText).toContain("Offline collaborator note");
  });
});

"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import {IndexeddbPersistence} from "y-indexeddb"
import { enqueueUpdate } from "@/lib/outbox";
import { syncDocument } from "@/lib/sync/engine";
import { syncAwareness } from "@/lib/sync/awareness";
import EditorToolbar from "@/components/EditorToolbar";

const SYNC_INTERVAL_MS = 3000;
const PUSH_DEBOUNCE_MS = 800;

// y-prosemirror/y-tiptap's cursor rendering only accepts 6-digit hex colors
// (validated against /^#[0-9a-fA-F]{6}$/ internally) — hsl()/rgb() strings
// fail that check. Picking from a fixed hex palette, deterministically
// per-user, so the same person always gets the same cursor color.
const CURSOR_COLORS = [
  "#f97316", "#ef4444", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#eab308",
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

const Editor = ({
  documentId,
  currentUserId,
  currentUserName,
  canEdit,
}: {
  documentId: string;
  currentUserId: string;
  currentUserName: string;
  canEdit: boolean;
}) => {
  const [doc] = useState(() => new Y.Doc());
  const [awareness] = useState(() => new Awareness(doc));
  const [wordCount, setWordCount] = useState(0);
  const awarenessDestroyRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const persistence = new IndexeddbPersistence(documentId, doc);
    persistence.on("synced", () => {
      console.log("Loaded data from indexeddb");
    });

    const sync = () => {
      syncDocument(documentId, doc).catch((error) => {
        console.error("Sync failed:", error);
      });
    };

    let debounceId: ReturnType<typeof setTimeout> | undefined;
    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      // Updates we just pulled from the server are tagged "remote" — re-queuing
      // them would push them straight back, looping for no reason.
      if (origin === "remote") {
        return;
      }
      enqueueUpdate(documentId, update);

      // Push shortly after typing pauses, rather than waiting for the next
      // interval tick — cuts latency on the sending side specifically; the
      // interval below remains the fallback for "nobody typed, but pull
      // whatever everyone else pushed."
      clearTimeout(debounceId);
      debounceId = setTimeout(sync, PUSH_DEBOUNCE_MS);
    };
    doc.on("update", handleUpdate);

    sync();
    const intervalId = setInterval(sync, SYNC_INTERVAL_MS);
    window.addEventListener("online", sync);

    return () => {
      persistence.destroy();
      doc.off("update", handleUpdate);
      clearTimeout(debounceId);
      clearInterval(intervalId);
      window.removeEventListener("online", sync);
    };
  }, [documentId, doc]);

  useEffect(() => {
    // Cancel a destroy scheduled by a StrictMode / Fast Refresh replay of
    // this effect — see the cleanup below.
    clearTimeout(awarenessDestroyRef.current);

    const tick = () => {
      syncAwareness(documentId, awareness).catch((error) => {
        console.error("Awareness sync failed:", error);
      });
    };

    tick();
    const intervalId = setInterval(tick, SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      // Awareness.destroy() is unrecoverable: it nulls the local state, and
      // setLocalStateField() silently no-ops on a null state — so a client
      // that destroys its awareness never publishes its caret/name again
      // (it pushes `state: null` to everyone instead). Dev-mode StrictMode
      // and Fast Refresh replay this effect on a still-mounted component,
      // so destroying synchronously here killed the carets for the whole
      // session. Schedule the destroy on a macrotask instead: a replay
      // cancels it (top of the effect); only a real unmount lets it fire.
      awarenessDestroyRef.current = setTimeout(() => awareness.destroy(), 0);
    };
  }, [documentId, awareness]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false
      }),
      Collaboration.configure({
        document: doc
      }),
      CollaborationCaret.configure({
        provider: { awareness },
        user: {
          name: currentUserName,
          color: colorForUser(currentUserId),
        },
        // U+2060 word joiners are zero-width but in-flow, giving the caret span
        // its line height. Without them the span has no in-flow content → height 0
        // → the label's `top: -1.4em` lands inside the text line instead of above it.
        render: (user) => {
          const cursor = document.createElement("span");
          cursor.classList.add("collaboration-carets__caret");
          cursor.setAttribute("style", `border-color: ${user.color}`);
          cursor.appendChild(document.createTextNode("⁠"));
          const label = document.createElement("div");
          label.classList.add("collaboration-carets__label");
          label.setAttribute("style", `background-color: ${user.color}`);
          label.appendChild(document.createTextNode(user.name));
          cursor.appendChild(label);
          cursor.appendChild(document.createTextNode("⁠"));
          return cursor;
        },
      }),
    ],
    editable: canEdit,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(
        text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length,
      );
    },
    editorProps: {
      attributes: {
        class: "min-h-[60vh] w-full p-8 focus:outline-none",
      },
    },
  });
  if (!editor) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border bg-card shadow-sm">
          {canEdit && <EditorToolbar editor={editor} />}
          <EditorContent editor={editor} />
        </div>
        <p className="mt-2 text-right text-xs text-muted-foreground">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </p>
      </div>
    </div>
  );
}

export default Editor

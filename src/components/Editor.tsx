"use client";
import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration"
import * as Y from "yjs";
import {IndexeddbPersistence} from "y-indexeddb"
import { enqueueUpdate } from "@/lib/outbox";
import { syncDocument } from "@/lib/sync/engine";

const SYNC_INTERVAL_MS = 10000;

const Editor = ({ documentId }: { documentId: string }) => {
  const [doc] = useState(() => new Y.Doc());

  useEffect(() => {
    const persistence = new IndexeddbPersistence(documentId, doc);
    persistence.on("synced", () => {
      console.log("Loaded data from indexeddb");
    });

    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      // Updates we just pulled from the server are tagged "remote" — re-queuing
      // them would push them straight back, looping for no reason.
      if (origin === "remote") {
        return;
      }
      enqueueUpdate(documentId, update);
    };
    doc.on("update", handleUpdate);

    return () => {
      persistence.destroy();
      doc.off("update", handleUpdate);
    };
  }, [documentId, doc]);

  useEffect(() => {
    const sync = () => {
      syncDocument(documentId, doc).catch((error) => {
        console.error("Sync failed:", error);
      });
    };

    sync();

    const intervalId = setInterval(sync, SYNC_INTERVAL_MS);
    window.addEventListener("online", sync);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("online", sync);
    };
  }, [documentId, doc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false
      }),
      Collaboration.configure({
        document: doc
      }),
    ],
    editorProps: {
      attributes: {
        class: "min-h-[400px] w-full max-w-3xl mx-auto rounded-md border p-4 focus:outline-none "
      }
    }
  });
  if (!editor) {
    return null;
  }
  return <EditorContent editor={editor} />;
}

export default Editor

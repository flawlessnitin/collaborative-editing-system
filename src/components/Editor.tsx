"use client";
import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration"
import * as Y from "yjs";
import {IndexeddbPersistence} from "y-indexeddb"
import { enqueueUpdate } from "@/lib/outbox";

const Editor = () => {
  const [doc] = useState(() => new Y.Doc());

  useEffect(() => {
    const persistence = new IndexeddbPersistence("my-document", doc);
    persistence.on("synced", () => {
      console.log("Loaded data from indexeddb");
    });

    const handleUpdate = (update: Uint8Array) => {
      enqueueUpdate(update);
    };
    doc.on("update", handleUpdate);

    return () => {
      persistence.destroy();
      doc.off("update", handleUpdate);
    };
  }, [doc]);

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

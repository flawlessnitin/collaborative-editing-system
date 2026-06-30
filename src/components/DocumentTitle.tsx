"use client";

import { useState, useTransition } from "react";
import { renameDocumentAction } from "@/lib/documents/actions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DocumentTitle = ({
  documentId,
  initialTitle,
  canEdit,
}: {
  documentId: string;
  initialTitle: string;
  canEdit: boolean;
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === title) {
      setDraft(title);
      return;
    }
    setTitle(trimmed);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", trimmed);
      await renameDocumentAction(documentId, formData);
    });
  };

  if (!canEdit) {
    return <h1 className="truncate text-lg font-semibold">{title}</h1>;
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }
          if (event.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        className="h-8 max-w-xs text-lg font-semibold"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(title);
        setEditing(true);
      }}
      title="Click to rename"
      aria-label={`Document title: ${title}. Click to rename.`}
      className={cn(
        "-mx-1 truncate rounded px-1 text-left text-lg font-semibold hover:bg-accent",
        isPending && "opacity-60",
      )}
    >
      {title}
    </button>
  );
};

export default DocumentTitle;

"use client";

import { useState } from "react";
import { captureVersionAction, restoreVersionAction } from "@/lib/versions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface VersionEntry {
  id: string;
  label: string;
  createdAt: Date;
  author: { name: string };
}

const VersionHistoryDialog = ({
  documentId,
  versions,
  canEdit,
}: {
  documentId: string;
  versions: VersionEntry[];
  canEdit: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const captureAction = captureVersionAction.bind(null, documentId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          History
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
        </DialogHeader>

        {canEdit && (
          <form action={captureAction} className="flex gap-2 pb-3 border-b">
            <div className="flex-1 space-y-1">
              <Label htmlFor="version-label" className="sr-only">
                Label
              </Label>
              <Input id="version-label" name="label" placeholder="Snapshot label (optional)" />
            </div>
            <Button type="submit">Capture</Button>
          </form>
        )}

        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {versions.length === 0 && (
            <li className="text-sm text-gray-500">No versions captured yet.</li>
          )}
          {versions.map((version) => {
            const restoreAction = restoreVersionAction.bind(null, documentId, version.id);
            return (
              <li key={version.id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate">
                  {version.label}
                  <span className="text-gray-500">
                    {" "}
                    — {version.author.name}, {new Date(version.createdAt).toLocaleString()}
                  </span>
                </span>
                {canEdit && (
                  <form action={restoreAction}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        if (!confirm(`Restore "${version.label}"? This applies it as a new edit on top of the current document — nothing is deleted.`)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      Restore
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

export default VersionHistoryDialog;

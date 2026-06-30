"use client";

import { useState } from "react";
import { inviteCollaboratorAction } from "@/lib/documents/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Collaborator {
  userId: string;
  role: string;
  user: { name: string; email: string };
}

const ShareDialog = ({
  documentId,
  collaborators,
}: {
  documentId: string;
  collaborators: Collaborator[];
}) => {
  const [open, setOpen] = useState(false);
  const inviteAction = inviteCollaboratorAction.bind(null, documentId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this document</DialogTitle>
        </DialogHeader>

        <ul className="space-y-2">
          {collaborators.map((c) => (
            <li key={c.userId} className="flex items-center justify-between text-sm">
              <span>
                {c.user.name} <span className="text-gray-500">({c.user.email})</span>
              </span>
              <Badge variant="secondary">{c.role}</Badge>
            </li>
          ))}
        </ul>

        <form action={inviteAction} className="space-y-3 pt-2 border-t">
          <div className="space-y-1">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input id="invite-email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <Select name="role" defaultValue="editor">
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Invite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;

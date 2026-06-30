"use server";

import { redirect } from "next/navigation";
import * as Y from "yjs";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import { inviteSchema } from "@/lib/validations/membership";
import { sendInviteEmail } from "@/lib/email";

export async function createDocumentAction() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // A brand-new document still needs a valid (empty) compacted CRDT state —
  // the sync route always reconstructs from `state`, so it can never be empty.
  const emptyDoc = new Y.Doc();
  const state = new Uint8Array(Y.encodeStateAsUpdate(emptyDoc));
  const stateVector = new Uint8Array(Y.encodeStateVector(emptyDoc));
  emptyDoc.destroy();

  const document = await prisma.document.create({
    data: {
      title: "Untitled Document",
      state,
      stateVector,
      ownerId: session.userId,
      memberships: {
        create: {
          userId: session.userId,
          role: "owner",
        },
      },
    },
  });

  redirect(`/documents/${document.id}`);
}

export async function inviteCollaboratorAction(documentId: string, formData: FormData) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Only the Owner manages access — Editors can write content, not grant access.
  const membership = await assertMembership(session.userId, documentId, "owner");
  if (!membership) {
    redirect(`/documents/${documentId}?error=${encodeURIComponent("Only the owner can invite collaborators")}`);
  }

  const result = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/documents/${documentId}?error=${encodeURIComponent(message)}`);
  }

  const { email, role } = result.data;

  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (!invitedUser) {
    redirect(`/documents/${documentId}?error=${encodeURIComponent("No user found with that email")}`);
  }

  if (invitedUser.id === membership.userId) {
    redirect(`/documents/${documentId}?error=${encodeURIComponent("You already own this document")}`);
  }

  // upsert: inviting an existing member again just changes their role,
  // rather than erroring on the duplicate (documentId, userId) pair.
  await prisma.membership.upsert({
    where: { documentId_userId: { documentId, userId: invitedUser.id } },
    create: { documentId, userId: invitedUser.id, role },
    update: { role },
  });

  const [document, inviter] = await Promise.all([
    prisma.document.findUnique({ where: { id: documentId }, select: { title: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
  ]);

  // Access is already granted at this point — email is a notification on
  // top, not a precondition, so its own internal try/catch handles failure.
  await sendInviteEmail({
    to: email,
    documentTitle: document?.title ?? "a document",
    documentId,
    inviterName: inviter?.name ?? "Someone",
    role,
  });

  redirect(`/documents/${documentId}`);
}

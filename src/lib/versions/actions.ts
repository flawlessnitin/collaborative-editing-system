"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import { computeRestoreUpdate } from "@/lib/sync/restore";
import { mergeUpdatesIntoState } from "@/lib/sync/merge";

export async function captureVersionAction(documentId: string, formData: FormData) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const membership = await assertMembership(session.userId, documentId, "editor");
  if (!membership) {
    redirect(`/documents/${documentId}?error=${encodeURIComponent("Only editors can capture versions")}`);
  }

  const labelInput = formData.get("label");
  const label =
    typeof labelInput === "string" && labelInput.trim().length > 0
      ? labelInput.trim()
      : `Snapshot — ${new Date().toLocaleString()}`;

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    redirect(`/documents/${documentId}?error=${encodeURIComponent("Document not found")}`);
  }

  await prisma.version.create({
    data: {
      documentId,
      label,
      state: document.state,
      authorId: session.userId,
    },
  });

  redirect(`/documents/${documentId}`);
}

export async function restoreVersionAction(documentId: string, versionId: string) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const membership = await assertMembership(session.userId, documentId, "editor");
  if (!membership) {
    redirect(`/documents/${documentId}?error=${encodeURIComponent("Only editors can restore versions")}`);
  }

  const [document, version] = await Promise.all([
    prisma.document.findUnique({ where: { id: documentId } }),
    prisma.version.findUnique({ where: { id: versionId } }),
  ]);

  if (!document || !version || version.documentId !== documentId) {
    redirect(`/documents/${documentId}?error=${encodeURIComponent("Version not found")}`);
  }

  const restoreUpdate = computeRestoreUpdate(document.state, version.state);

  // Reuses the exact same merge function the sync route's push path uses —
  // restore is deliberately not special-cased.
  const merged = mergeUpdatesIntoState(document.state, [restoreUpdate]);

  await prisma.$transaction([
    prisma.document.update({
      where: { id: documentId },
      data: { state: merged.state, stateVector: merged.stateVector },
    }),
    // Appending to the same log the sync route writes to means connected
    // clients pick up the restore through their normal pull poll — no
    // separate "restore" code path needed on the client at all.
    prisma.docUpdate.create({
      data: { documentId, update: restoreUpdate, authorId: session.userId },
    }),
  ]);

  redirect(`/documents/${documentId}`);
}

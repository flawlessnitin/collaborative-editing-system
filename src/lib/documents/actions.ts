"use server";

import { redirect } from "next/navigation";
import * as Y from "yjs";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

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

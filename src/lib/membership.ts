import { Role } from "@/generated/prisma/enums";
import prisma from "./prisma";

export const ROLE_RANK: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

// Pulled out as its own pure function so it can be unit-tested directly —
// this is the exact spot a prior bug lived: comparing roles with `<` directly
// (string comparison, which sorts alphabetically: "editor" < "owner" <
// "viewer") let a viewer pass an editor-minimum check.
export function meetsMinRole(role: Role, minRole: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export async function assertMembership(userId: string, documentId: string, minRole: Role) {
  const membership = await prisma.membership.findUnique({
    where: {
      documentId_userId: {
        documentId,
        userId
      }
    }
  });

  if (!membership) {
    return null;
  }

  if (!meetsMinRole(membership.role, minRole)) {
    return null;
  }

  return membership;
}

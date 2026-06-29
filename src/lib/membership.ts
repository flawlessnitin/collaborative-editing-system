import { Role } from "@/generated/prisma/enums";
import prisma from "./prisma";

const ROLE_RANK: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

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

  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    return null;
  }

  return membership;
}

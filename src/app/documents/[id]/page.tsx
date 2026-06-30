import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import Editor from "@/components/Editor";
import ShareDialog from "@/components/ShareDialog";
import VersionHistoryDialog from "@/components/VersionHistoryDialog";
import prisma from "@/lib/prisma";

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const membership = await assertMembership(session.userId, id, "viewer");
  if (!membership) {
    notFound();
  }

  const [memberships, versions] = await Promise.all([
    prisma.membership.findMany({
      where: { documentId: id },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.version.findMany({
      where: { documentId: id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const canEdit = membership.role === "owner" || membership.role === "editor";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm text-gray-500">Your role: {membership.role}</span>
        <div className="flex items-center gap-2">
          <VersionHistoryDialog documentId={id} versions={versions} canEdit={canEdit} />
          {membership.role === "owner" && (
            <ShareDialog documentId={id} collaborators={memberships} />
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 rounded-md bg-red-50 p-3 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      <Editor documentId={id} />
    </div>
  );
}

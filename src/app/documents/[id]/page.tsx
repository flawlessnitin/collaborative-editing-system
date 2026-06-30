import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import Editor from "@/components/Editor";
import ShareDialog from "@/components/ShareDialog";
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

  const memberships = await prisma.membership.findMany({
    where: { documentId: id },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm text-gray-500">Your role: {membership.role}</span>
        {membership.role === "owner" && (
          <ShareDialog documentId={id} collaborators={memberships} />
        )}
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

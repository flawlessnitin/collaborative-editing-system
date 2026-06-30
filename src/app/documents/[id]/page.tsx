import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import Editor from "@/components/Editor";
import ShareDialog from "@/components/ShareDialog";
import VersionHistoryDialog from "@/components/VersionHistoryDialog";
import PresenceIndicator from "@/components/PresenceIndicator";
import SummarizeButton from "@/components/SummarizeButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const currentUserName =
    memberships.find((entry) => entry.userId === session.userId)?.user.name ?? "Anonymous";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Your role: {membership.role}</span>
          <PresenceIndicator documentId={id} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SummarizeButton documentId={id} />
          <VersionHistoryDialog documentId={id} versions={versions} canEdit={canEdit} />
          {membership.role === "owner" && (
            <ShareDialog documentId={id} collaborators={memberships} />
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" role="alert" className="mx-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!canEdit && (
        <Alert className="mx-4">
          <AlertDescription>You have view-only access to this document.</AlertDescription>
        </Alert>
      )}

      <Editor
        documentId={id}
        currentUserId={session.userId}
        currentUserName={currentUserName}
        canEdit={canEdit}
      />
    </div>
  );
}

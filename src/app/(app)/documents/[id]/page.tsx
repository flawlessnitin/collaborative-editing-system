import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import { cn } from "@/lib/utils";
import Editor from "@/components/Editor";
import ShareDialog from "@/components/ShareDialog";
import VersionHistoryDialog from "@/components/VersionHistoryDialog";
import PresenceIndicator from "@/components/PresenceIndicator";
import SummarizeButton from "@/components/SummarizeButton";
import DocumentTitle from "@/components/DocumentTitle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import prisma from "@/lib/prisma";

const ROLE_CLASSES: Record<string, string> = {
  owner: "bg-primary/10 text-primary",
  editor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  viewer: "bg-muted text-muted-foreground",
};

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

  const [document, memberships, versions] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      select: { title: true },
    }),
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

  if (!document) {
    notFound();
  }

  const canEdit = membership.role === "owner" || membership.role === "editor";
  const currentUserName =
    memberships.find((entry) => entry.userId === session.userId)?.user.name ?? "Anonymous";

  return (
    <div className="flex flex-col">
      {/* Document header */}
      <div className="border-b px-6 py-4 space-y-2">
        {/* Row 1: Title + action buttons */}
        <div className="flex items-start justify-between gap-4">
          <DocumentTitle
            documentId={id}
            initialTitle={document.title}
            canEdit={canEdit}
          />
          <div className="flex shrink-0 items-center gap-1.5">
            <SummarizeButton documentId={id} />
            <VersionHistoryDialog
              documentId={id}
              versions={versions}
              canEdit={canEdit}
            />
            {membership.role === "owner" && (
              <ShareDialog documentId={id} collaborators={memberships} />
            )}
          </div>
        </div>
        {/* Row 2: Role badge + presence */}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              ROLE_CLASSES[membership.role],
            )}
          >
            {membership.role}
          </span>
          <PresenceIndicator documentId={id} />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" role="alert" className="mx-6 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!canEdit && (
        <Alert className="mx-6 mt-4">
          <AlertDescription>
            You have view-only access to this document.
          </AlertDescription>
        </Alert>
      )}

      {/* Keyed by document id: the App Router reuses this page component
          across /documents/[id] param navigations, and Editor's Y.Doc and
          Awareness are created once per mount — without the key, switching
          documents via the sidebar would keep syncing the previous
          document's Yjs state into the new one. */}
      <Editor
        key={id}
        documentId={id}
        currentUserId={session.userId}
        currentUserName={currentUserName}
        canEdit={canEdit}
      />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createDocumentAction } from "@/lib/documents/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/time";
import prisma from "@/lib/prisma";

const ROLE_CLASSES: Record<string, string> = {
  owner: "bg-primary/10 text-primary",
  editor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  viewer: "bg-muted text-muted-foreground",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [memberships, user] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: session.userId },
      include: { document: true },
      orderBy: { document: { updatedAt: "desc" } },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    }),
  ]);

  return (
    <div className="flex flex-col items-center p-8 pt-16">
      {/* Welcome block */}
      <div className="text-center space-y-3 mb-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
          C
        </div>
        <h1 className="text-2xl font-bold">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Select a document from the sidebar or create a new one.
        </p>
        <form action={createDocumentAction} className="mt-2">
          <Button type="submit">+ New Document</Button>
        </form>
      </div>

      {memberships.length > 0 && (
        <div className="w-full max-w-xl">
          <Separator className="mb-6" />
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent
          </p>
          <ul className="space-y-1">
            {memberships.slice(0, 5).map((m) => (
              <li key={m.documentId}>
                <Link
                  href={`/documents/${m.documentId}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                >
                  <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">
                    {m.document.title}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      ROLE_CLASSES[m.role],
                    )}
                  >
                    {m.role}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(m.document.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

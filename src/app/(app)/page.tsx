import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createDocumentAction } from "@/lib/documents/actions";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.userId },
    include: { document: true },
    orderBy: { document: { updatedAt: "desc" } },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick up where you left off, or start something new.
          </p>
        </div>
        <form action={createDocumentAction}>
          <Button type="submit">New Document</Button>
        </form>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">No documents yet — create one to get started.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {memberships.map((membership) => (
            <li key={membership.documentId}>
              <Link
                href={`/documents/${membership.documentId}`}
                className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40"
              >
                <span className="font-medium">{membership.document.title}</span>
                <span className="text-xs text-muted-foreground">{membership.role}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

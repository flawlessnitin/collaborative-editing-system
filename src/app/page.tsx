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
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Your Documents</h1>
        <form action={createDocumentAction}>
          <Button type="submit">New Document</Button>
        </form>
      </div>

      {memberships.length === 0 ? (
        <p className="text-sm text-gray-500">No documents yet — create one to get started.</p>
      ) : (
        <ul className="space-y-2">
          {memberships.map((membership) => (
            <li key={membership.documentId}>
              <Link
                href={`/documents/${membership.documentId}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-gray-50 dark:hover:bg-zinc-900"
              >
                <span>{membership.document.title}</span>
                <span className="text-xs text-gray-500">{membership.role}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

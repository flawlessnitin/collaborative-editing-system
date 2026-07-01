import Link from "next/link";
import { LogOutIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { createDocumentAction } from "@/lib/documents/actions";
import ConnectionStatus from "@/components/ConnectionStatus";
import SidebarDocList from "@/components/SidebarDocList";
import ThemeToggle from "@/components/ThemeToggle";
import prisma from "@/lib/prisma";

export default async function AppSidebar() {
  const session = await getSession();
  if (!session) return null;

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

  const docs = memberships.map((m) => ({
    id: m.documentId,
    title: m.document.title,
    role: m.role as "owner" | "editor" | "viewer",
  }));

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-sidebar-foreground"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            C
          </span>
          <span>Collab</span>
        </Link>
      </div>

      {/* New Document */}
      <div className="px-3 pb-3">
        <form action={createDocumentAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 bg-sidebar hover:bg-accent"
          >
            <PlusIcon className="h-4 w-4" />
            New Document
          </Button>
        </form>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-3">
        <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/50">
          Your Documents
        </p>
        <SidebarDocList docs={docs} />
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-3 space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="truncate text-sm font-medium text-sidebar-foreground">
            {user?.name}
          </span>
        </div>
        <div className="flex items-center justify-between px-1">
          <ConnectionStatus />
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                title="Log out"
              >
                <LogOutIcon className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
        <p className="px-1 text-[11px] text-sidebar-foreground/30">
          © {new Date().getFullYear()} Nitin Sahu
        </p>
      </div>
    </aside>
  );
}

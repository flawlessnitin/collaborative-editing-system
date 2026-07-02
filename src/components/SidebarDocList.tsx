"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "owner" | "editor" | "viewer";

const ROLE_CLASSES: Record<Role, string> = {
  owner: "bg-primary/10 text-primary",
  editor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  viewer: "bg-muted text-muted-foreground",
};

export default function SidebarDocList({
  docs,
}: {
  docs: { id: string; title: string; role: Role }[];
}) {
  const pathname = usePathname();

  if (docs.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-sidebar-foreground/50">
        No documents yet.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {docs.map((doc) => {
        const isActive = pathname === `/documents/${doc.id}`;
        return (
          <li key={doc.id}>
            <Link
              href={`/documents/${doc.id}`}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <FileTextIcon className="h-4 w-4 shrink-0 opacity-60" />
              <span className="flex-1 truncate">{doc.title}</span>
              <span
                className={cn(
                  "rounded px-1 py-0.5 text-[10px] font-medium",
                  ROLE_CLASSES[doc.role],
                )}
              >
                {doc.role}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

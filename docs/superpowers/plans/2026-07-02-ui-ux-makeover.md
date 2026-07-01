# UI/UX Makeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the app into a Linear/Vercel-style layout with a persistent left sidebar, Next.js route groups separating auth from app pages, a dark mode toggle, and visual polish across all pages.

**Architecture:** Two route groups — `(auth)` for login/register (full-screen centered, no sidebar) and `(app)` for authenticated pages (240px persistent sidebar + flex-1 main area). Sidebar is a server component that fetches the user's document list; a client child `SidebarDocList` handles active-state highlighting via `usePathname`. Dark mode via `next-themes`, toggled from the sidebar footer; the existing `globals.css` `:root`/`.dark` token sets already cover both themes with no CSS changes needed.

**Tech Stack:** Next.js App Router route groups, `next-themes`, shadcn/ui (`separator`, `dropdown-menu`, `sheet`), Tailwind v4, Tiptap, Lucide icons

## Global Constraints

- Read `node_modules/next/dist/docs/` for any Next.js App Router API you are unsure about — this version has breaking changes from prior training data
- All work on branch `feat/ui-makeover`
- No changes to: sync engine, CRDT logic, server actions, database schema, or existing Vitest tests
- Run `pnpm test` after each task to confirm existing tests still pass
- Use `git mv` for file moves to preserve git history
- Route group folder names use parentheses — `(app)` and `(auth)` — these never appear in URLs
- All paths in git commands must be quoted on Windows (e.g., `"src/app/(auth)/..."`)

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (pnpm manages automatically)
- Create: `src/components/ui/separator.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/sheet.tsx`

**Interfaces:**
- Produces: `Separator` from `@/components/ui/separator`; `Sheet`, `SheetContent`, `SheetTrigger` from `@/components/ui/sheet`; `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu`

- [ ] **Step 1: Add next-themes**

```bash
pnpm add next-themes
```

Expected: `package.json` gains `"next-themes"` in `dependencies`.

- [ ] **Step 2: Add shadcn components**

```bash
pnpm dlx shadcn@latest add separator dropdown-menu sheet
```

Expected: 3 new files in `src/components/ui/`. Accept any prompts with the default.

- [ ] **Step 3: Verify no new type errors**

```bash
pnpm exec tsc --noEmit 2>&1 | tail -5
```

Note the error count before this task. Confirm it hasn't increased.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/ui/separator.tsx src/components/ui/dropdown-menu.tsx src/components/ui/sheet.tsx
git commit -m "feat: add next-themes and shadcn separator/dropdown-menu/sheet"
```

---

### Task 2: Route restructure — create route groups and move files

The biggest structural change. Creates `(auth)` and `(app)` route groups, moves all pages into them, strips the root layout to a bare shell, and adds `ThemeProvider`.

**Files:**
- Modify: `src/app/layout.tsx` (strip to bare shell + ThemeProvider)
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(app)/layout.tsx` (stub — sidebar wired in Task 3)
- Move: `src/app/login/page.tsx` → `src/app/(auth)/login/page.tsx`
- Move: `src/app/register/page.tsx` → `src/app/(auth)/register/page.tsx`
- Move: `src/app/page.tsx` → `src/app/(app)/page.tsx`
- Move: `src/app/documents/[id]/page.tsx` → `src/app/(app)/documents/[id]/page.tsx`

**Interfaces:**
- Consumes: `ThemeProvider` from `next-themes` (Task 1), `getSession` from `@/lib/auth/session`
- Produces: `(app)/layout.tsx` — async server component, guards session, renders sidebar stub + `<main>`

- [ ] **Step 1: Create route group directories**

```bash
mkdir -p "src/app/(auth)/login"
mkdir -p "src/app/(auth)/register"
mkdir -p "src/app/(app)/documents/[id]"
```

- [ ] **Step 2: Move auth pages**

```bash
git mv "src/app/login/page.tsx" "src/app/(auth)/login/page.tsx"
git mv "src/app/register/page.tsx" "src/app/(auth)/register/page.tsx"
```

- [ ] **Step 3: Move app pages**

```bash
git mv "src/app/page.tsx" "src/app/(app)/page.tsx"
git mv "src/app/documents/[id]/page.tsx" "src/app/(app)/documents/[id]/page.tsx"
```

- [ ] **Step 4: Write `src/app/(auth)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/app/(app)/layout.tsx`** (sidebar placeholder; full sidebar added Task 3)

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar slotted in Task 3 */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Strip `src/app/layout.tsx` to bare shell**

Replace the entire file:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Collaborative Document Editor",
  description:
    "A local-first, real-time collaborative document editor with offline sync and version history.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` on `<html>` is required by `next-themes` — it sets `class="dark"` server-side vs client-side causing a mismatch otherwise.

- [ ] **Step 7: Delete now-empty old directories**

```bash
rmdir "src/app/login"
rmdir "src/app/register"
rmdir "src/app/documents/[id]"
rmdir "src/app/documents"
```

If `rmdir` fails (non-empty), list the directory contents and move any remaining files first.

- [ ] **Step 8: Verify dev server**

```bash
pnpm dev
```

Open in browser:
- `http://localhost:3000/login` — login form, no sidebar
- `http://localhost:3000/register` — register form, no sidebar
- `http://localhost:3000/` (logged in) — dashboard
- `http://localhost:3000/` (logged out) — redirects to `/login`
- A document URL — editor page

- [ ] **Step 9: Run existing tests**

```bash
pnpm test
```

Expected: all pass — sync engine and membership tests are unaffected by routing.

- [ ] **Step 10: Commit**

```bash
git add "src/app/layout.tsx" "src/app/(auth)/" "src/app/(app)/"
git commit -m "feat: restructure into (auth) and (app) route groups with ThemeProvider"
```

---

### Task 3: AppSidebar + SidebarDocList

**Files:**
- Create: `src/components/SidebarDocList.tsx`
- Create: `src/components/AppSidebar.tsx`
- Modify: `src/app/(app)/layout.tsx` (wire in desktop sidebar)
- Delete: `src/components/Footer.tsx`

**Interfaces:**
- Consumes: `prisma` (membership + user fetch), `createDocumentAction`, `logoutAction`, `getSession`, `ConnectionStatus`
- Produces:
  - `SidebarDocList({ docs: Array<{ id: string; title: string; role: "owner" | "editor" | "viewer" }> })` — `"use client"`, needs `usePathname`
  - `AppSidebar()` — async server component, no props, fetches its own data

- [ ] **Step 1: Create `src/components/SidebarDocList.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/components/AppSidebar.tsx`**

```tsx
import Link from "next/link";
import { LogOutIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { createDocumentAction } from "@/lib/documents/actions";
import ConnectionStatus from "@/components/ConnectionStatus";
import SidebarDocList from "@/components/SidebarDocList";
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

      {/* Footer — ThemeToggle added in Task 4 */}
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
        <p className="px-1 text-[11px] text-sidebar-foreground/30">
          © {new Date().getFullYear()} Nitin Sahu
        </p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Wire sidebar into `src/app/(app)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AppSidebar from "@/components/AppSidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — hidden on mobile until Task 5 */}
      <div className="hidden md:flex h-full">
        <AppSidebar />
      </div>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Delete `src/components/Footer.tsx`**

```bash
git rm src/components/Footer.tsx
```

Copyright line now lives in the sidebar footer.

- [ ] **Step 5: Verify desktop sidebar in browser**

At `http://localhost:3000/` (logged in), a 240px sidebar should appear on the left showing: "C" logo + "Collab" link, "New Document" button, document list with role badges, user initial + name, connection status, logout button.

Clicking a document link should navigate to it and highlight that item in the list.

- [ ] **Step 6: Run tests**

```bash
pnpm test
```

- [ ] **Step 7: Commit**

```bash
git add src/components/AppSidebar.tsx src/components/SidebarDocList.tsx "src/app/(app)/layout.tsx"
git commit -m "feat: add persistent sidebar with document list, user footer, and nav"
```

---

### Task 4: ThemeToggle (dark mode button)

**Files:**
- Create: `src/components/ThemeToggle.tsx`
- Modify: `src/components/AppSidebar.tsx` (import + add to footer)

**Interfaces:**
- Consumes: `useTheme` from `next-themes`, `Button` from `@/components/ui/button`, `SunIcon`, `MoonIcon` from `lucide-react`
- Produces: `ThemeToggle()` — `"use client"`, no props

- [ ] **Step 1: Create `src/components/ThemeToggle.tsx`**

```tsx
"use client";

import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
      title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? (
        <SunIcon className="h-4 w-4" />
      ) : (
        <MoonIcon className="h-4 w-4" />
      )}
    </Button>
  );
}
```

- [ ] **Step 2: Add ThemeToggle to `src/components/AppSidebar.tsx`**

Add the import at the top:
```tsx
import ThemeToggle from "@/components/ThemeToggle";
```

Find the footer `div.flex.items-center.justify-between` and replace it:
```tsx
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
```

- [ ] **Step 3: Verify in browser**

Click the moon icon — full UI switches to dark mode. Click the sun — back to light. Hard-reload — preference persists (stored in `localStorage` by `next-themes`).

- [ ] **Step 4: Commit**

```bash
git add src/components/ThemeToggle.tsx src/components/AppSidebar.tsx
git commit -m "feat: add dark mode toggle in sidebar footer"
```

---

### Task 5: Mobile sidebar drawer

**Files:**
- Create: `src/components/MobileSidebarDrawer.tsx`
- Modify: `src/app/(app)/layout.tsx` (add mobile top bar + drawer)

**Interfaces:**
- Consumes: `Sheet`, `SheetContent`, `SheetTrigger` from `@/components/ui/sheet` (Task 1), `AppSidebar`
- Produces: `MobileSidebarDrawer({ children: React.ReactNode })` — `"use client"`, manages Sheet open state

- [ ] **Step 1: Create `src/components/MobileSidebarDrawer.tsx`**

```tsx
"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function MobileSidebarDrawer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        {children}
      </SheetContent>
    </Sheet>
  );
}
```

Note: `AppSidebar` is a server component passed as `children` — this is the RSC "donut pattern" and is supported. The server component renders on the server; its output is passed as a prop to this client component.

- [ ] **Step 2: Update `src/app/(app)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AppSidebar from "@/components/AppSidebar";
import MobileSidebarDrawer from "@/components/MobileSidebarDrawer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <AppSidebar />
      </div>

      <div className="flex flex-1 flex-col min-h-0">
        {/* Mobile-only top bar */}
        <div className="flex md:hidden items-center gap-3 border-b px-4 py-3 bg-card sticky top-0 z-10">
          <MobileSidebarDrawer>
            <AppSidebar />
          </MobileSidebarDrawer>
          <span className="font-bold text-sm">
            <span className="text-primary">Collab</span>
          </span>
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify on mobile viewport**

In browser devtools, toggle to < 768px wide. Desktop sidebar should disappear. A thin top bar with a hamburger button + "Collab" text should appear. Clicking the hamburger opens a left drawer containing the sidebar. Clicking a document link navigates (the drawer stays open — this is acceptable; closing on navigation requires a route-change listener and is out of scope).

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add src/components/MobileSidebarDrawer.tsx "src/app/(app)/layout.tsx"
git commit -m "feat: add mobile sidebar drawer with hamburger trigger"
```

---

### Task 6: Document editor page — new header layout

Replaces the single cramped toolbar row with a 2-row header: title + action buttons on row 1, role badge + presence on row 2.

**Files:**
- Modify: `src/app/(app)/documents/[id]/page.tsx`

**Interfaces:**
- Consumes: all existing imports in the file — no new components needed

- [ ] **Step 1: Add `cn` import to `src/app/(app)/documents/[id]/page.tsx`**

At the top of the file, add:
```tsx
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Add `ROLE_CLASSES` constant before the component**

```tsx
const ROLE_CLASSES: Record<string, string> = {
  owner: "bg-primary/10 text-primary",
  editor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  viewer: "bg-muted text-muted-foreground",
};
```

- [ ] **Step 3: Replace the return JSX**

```tsx
return (
  <div className="flex h-full flex-col">
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

    <Editor
      documentId={id}
      currentUserId={session.userId}
      currentUserName={currentUserName}
      canEdit={canEdit}
    />
  </div>
);
```

- [ ] **Step 4: Verify in browser**

Open a document. Header row 1: large editable title on the left, 2–3 compact action buttons on the right. Header row 2: colored role pill + active-user badges (if any collaborators are present).

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/documents/[id]/page.tsx"
git commit -m "feat: redesign document header with 2-row layout and role badge"
```

---

### Task 7: Formatting toolbar — visual groups with separators

**Files:**
- Modify: `src/components/EditorToolbar.tsx`

**Interfaces:**
- Consumes: `Separator` from `@/components/ui/separator` (Task 1)
- No new interfaces produced

- [ ] **Step 1: Replace `src/components/EditorToolbar.tsx`**

```tsx
"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered,
  Quote, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ToolbarButtonConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const GROUPS: ToolbarButtonConfig[][] = [
  [
    { label: "Bold", icon: Bold, isActive: (e) => e.isActive("bold"), run: (e) => e.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, isActive: (e) => e.isActive("italic"), run: (e) => e.chain().focus().toggleItalic().run() },
    { label: "Strikethrough", icon: Strikethrough, isActive: (e) => e.isActive("strike"), run: (e) => e.chain().focus().toggleStrike().run() },
    { label: "Inline code", icon: Code, isActive: (e) => e.isActive("code"), run: (e) => e.chain().focus().toggleCode().run() },
  ],
  [
    { label: "Heading 1", icon: Heading1, isActive: (e) => e.isActive("heading", { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: Heading2, isActive: (e) => e.isActive("heading", { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", icon: Heading3, isActive: (e) => e.isActive("heading", { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  ],
  [
    { label: "Bullet list", icon: List, isActive: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, isActive: (e) => e.isActive("orderedList"), run: (e) => e.chain().focus().toggleOrderedList().run() },
  ],
  [
    { label: "Quote", icon: Quote, isActive: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run() },
    { label: "Horizontal rule", icon: Minus, isActive: () => false, run: (e) => e.chain().focus().setHorizontalRule().run() },
  ],
];

const EditorToolbar = ({ editor }: { editor: Editor }) => {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1"
    >
      {GROUPS.map((group, groupIndex) => (
        <div key={groupIndex} className="flex items-center gap-1">
          {groupIndex > 0 && (
            <Separator orientation="vertical" className="mx-1 h-5" />
          )}
          {group.map(({ label, icon: Icon, isActive, run }) => {
            const active = isActive(editor);
            return (
              <Button
                key={label}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={label}
                aria-pressed={active}
                title={label}
                className={cn(
                  "h-8 w-8",
                  active && "bg-accent text-accent-foreground",
                )}
                onClick={() => run(editor)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default EditorToolbar;
```

- [ ] **Step 2: Verify in browser**

Open a document as editor/owner. The toolbar should show 4 groups of buttons separated by thin vertical lines: `B I S <>` | `H1 H2 H3` | `≡ ≔` | `" —`. All buttons should still function correctly.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

- [ ] **Step 4: Commit**

```bash
git add src/components/EditorToolbar.tsx
git commit -m "feat: group formatting toolbar into 4 sections with visual separators"
```

---

### Task 8: Editor — paper-like card + word count

**Files:**
- Modify: `src/components/Editor.tsx`

**Interfaces:**
- No new interfaces

- [ ] **Step 1: Add `wordCount` state to `src/components/Editor.tsx`**

After the existing `const [awareness]` line, add:
```tsx
const [wordCount, setWordCount] = useState(0);
```

- [ ] **Step 2: Add `onUpdate` to the `useEditor` call**

Inside `useEditor({...})`, after the `editable: canEdit` line, add:
```tsx
onUpdate: ({ editor }) => {
  const text = editor.getText();
  setWordCount(
    text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length,
  );
},
```

- [ ] **Step 3: Update `editorProps.attributes.class`**

Replace the current `editorProps` block:
```tsx
editorProps: {
  attributes: {
    class: "min-h-[60vh] w-full p-8 focus:outline-none",
  },
},
```

(Remove the `canEdit` conditional — the card outer div provides the rounded corners and border now, not the editor content div.)

- [ ] **Step 4: Replace the return statement**

Replace from `if (!editor) { return null; }` to the end of the component:

```tsx
if (!editor) {
  return null;
}

return (
  <div className="flex-1 overflow-auto p-4 sm:p-6">
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border bg-card shadow-sm">
        {canEdit && <EditorToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
      <p className="mt-2 text-right text-xs text-muted-foreground">
        {wordCount} {wordCount === 1 ? "word" : "words"}
      </p>
    </div>
  </div>
);
```

- [ ] **Step 5: Verify in browser**

Open a document. The editor should appear as a white card with a subtle border and shadow (clearly distinct from the page background). Typing updates the word counter below the card in real time.

- [ ] **Step 6: Run tests**

```bash
pnpm test
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Editor.tsx
git commit -m "feat: paper-like editor card with live word count"
```

---

### Task 9: Dashboard redesign + `formatRelativeTime`

**Files:**
- Create: `src/lib/utils/time.ts`
- Modify: `src/app/(app)/page.tsx`

**Interfaces:**
- Produces: `formatRelativeTime(date: Date): string` from `@/lib/utils/time`

- [ ] **Step 1: Create `src/lib/utils/time.ts`**

```ts
export function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
```

- [ ] **Step 2: Replace `src/app/(app)/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify in browser**

The `/` route should show: centered "C" logo mark, "Welcome back, [name]", "New Document" button, a "Recent" section with up to 5 documents showing title, role badge, and relative time (e.g., "3m ago", "yesterday").

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/time.ts "src/app/(app)/page.tsx"
git commit -m "feat: redesign dashboard with welcome block and recent docs list"
```

---

### Task 10: Auth pages — add logo mark

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Update the text-center block in `src/app/(auth)/login/page.tsx`**

Find:
```tsx
<div className="text-center">
  <h1 className="text-2xl font-bold">Log In</h1>
  <p className="text-sm text-muted-foreground mt-2">Enter your credentials to continue</p>
</div>
```

Replace with:
```tsx
<div className="text-center">
  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
    C
  </div>
  <h1 className="text-2xl font-bold">Log In</h1>
  <p className="text-sm text-muted-foreground mt-2">Enter your credentials to continue</p>
</div>
```

- [ ] **Step 2: Update the text-center block in `src/app/(auth)/register/page.tsx`**

Find:
```tsx
<div className="text-center">
  <h1 className="text-2xl font-bold">Create an Account</h1>
  <p className="text-sm text-muted-foreground mt-2">Sign up to get started</p>
</div>
```

Replace with:
```tsx
<div className="text-center">
  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
    C
  </div>
  <h1 className="text-2xl font-bold">Create an Account</h1>
  <p className="text-sm text-muted-foreground mt-2">Sign up to get started</p>
</div>
```

- [ ] **Step 3: Verify in browser (logged out)**

`http://localhost:3000/login` and `/register` should each show a small indigo "C" logo mark above the form heading.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/login/page.tsx" "src/app/(auth)/register/page.tsx"
git commit -m "feat: add logo mark to auth pages"
```

---

### Task 11: Final verification

- [ ] **Step 1: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Fix all errors before continuing.

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Fix all errors. Warnings are OK.

- [ ] **Step 3: Tests**

```bash
pnpm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Build**

```bash
pnpm build
```

Expected: successful build. If it fails with missing env vars, set CI placeholders:

```bash
DATABASE_URL="postgresql://x:x@localhost/x" DIRECT_URL="postgresql://x:x@localhost/x" JWT_SECRET="placeholder" RESEND_API_KEY="placeholder" GEMINI_API_KEY="placeholder" NEXT_PUBLIC_APP_URL="http://localhost:3000" pnpm build
```

- [ ] **Step 5: Manual smoke test** (with `pnpm dev` running)

- [ ] Login page: logo mark visible, form submits, wrong password shows red alert, success redirects to `/`
- [ ] Register page: logo mark visible, duplicate email shows error
- [ ] Dashboard (`/`): welcome message with user name, "New Document" creates doc, recent list shows relative times, sidebar updates after creation
- [ ] Sidebar (desktop, ≥ 768px): all docs listed with role badges, active doc highlighted, dark mode toggle switches theme, logout button works
- [ ] Sidebar (mobile, < 768px): hamburger + "Collab" visible, drawer opens and closes, links navigate correctly
- [ ] Document editor: 2-row header visible, role badge colored correctly, formatting toolbar has 4 separated groups, editor is a card with shadow, word count updates while typing
- [ ] Dark mode: no raw white/black colors visible anywhere — all surfaces use token colors

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "chore: final verification pass — UI/UX makeover complete"
```

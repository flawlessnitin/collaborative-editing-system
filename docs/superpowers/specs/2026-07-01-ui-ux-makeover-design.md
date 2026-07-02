# UI/UX Makeover Design — Collaborative Document Editor

**Date:** 2026-07-01  
**Scope:** Full visual/structural makeover — Linear/Vercel aesthetic, sidebar navigation, dark mode toggle  
**Branch:** `feat/ui-makeover`

---

## 1. Approach

Sidebar-first full makeover. The app moves from a "header + full-width page" model to a persistent left sidebar layout. No top header bar on authenticated pages. Linear/Vercel aesthetic: dark sidebar tint, sharp typography, grouped controls, paper-like editor.

---

## 2. Route Structure

Switch to Next.js App Router route groups so auth pages and app pages have separate layout shells. URL paths are unchanged.

```
src/app/
├── layout.tsx                        ← bare root: html/body/fonts/ThemeProvider only
├── (auth)/
│   ├── layout.tsx                    ← full-screen centered, redirect → / if session exists
│   ├── login/page.tsx                ← moved from src/app/login/
│   └── register/page.tsx             ← moved from src/app/register/
└── (app)/
    ├── layout.tsx                    ← sidebar shell + session guard (redirect → /login)
    ├── page.tsx                      ← dashboard, moved from src/app/
    └── documents/[id]/page.tsx       ← editor, moved from src/app/documents/[id]/
```

The current `src/app/layout.tsx` shrinks to: `<html>` tag, font variables, `ThemeProvider`, `{children}`. No session check, no header, no footer — those move into `(app)/layout.tsx`.

---

## 3. Sidebar

**File:** `src/components/AppSidebar.tsx` (server component that fetches memberships and passes to client child)  
**File:** `src/components/SidebarDocList.tsx` (client — needs `usePathname()` for active-state highlighting)

**Width:** 240px fixed on desktop. On mobile: hidden by default, slides in as a `Sheet` (shadcn drawer) triggered by a hamburger button. On mobile only, a slim sticky bar (`md:hidden sticky top-0 flex items-center gap-3 p-3 border-b bg-card`) renders at the top of `(app)/layout.tsx` containing just the hamburger icon and the app name — this bar is invisible on `md:` and above.

**Structure (top to bottom):**

```
⬡ Collab                          ← logo icon + brand, links to /

─────────────────────────────

+ New Document                     ← full-width Button variant="outline"

─────────────────────────────

YOUR DOCUMENTS                     ← text-xs uppercase tracking-wide muted label

📄 Project Notes        [owner]    ← active: bg-accent row
📄 Untitled Document    [editor]
📄 Meeting Notes        [viewer]

─────────────────────────────

[●] Nitin Sahu                     ← colored avatar initial + display name
[🌙 / ☀]          [→]             ← ThemeToggle icon button + logout icon button
● Online                           ← ConnectionStatus (dot + label)
```

**Role badges in sidebar list:** small pill — owner=`bg-primary/10 text-primary`, editor=`bg-emerald-500/10 text-emerald-600`, viewer=`bg-muted text-muted-foreground`.

**Active document row:** `bg-accent text-accent-foreground rounded-md` on the list item matching `usePathname()`.

**Footer:** `src/components/Footer.tsx` is removed. Copyright line moves to sidebar bottom as a single `text-xs text-muted-foreground` line.

---

## 4. Document Editor Page

**File:** `src/app/(app)/documents/[id]/page.tsx`

### 4a. Document header

Replaces the current single-row toolbar. Two rows stacked:

**Row 1 (title + actions):**
- Left: `<DocumentTitle>` component (existing, no changes needed) — `text-2xl font-bold`
- Right: `<Button>Share</Button>` + `<DropdownMenu>` trigger `⋮` containing "Summarize" and "Version History" items

**Row 2 (meta):**
- Left: Role badge (colored pill, same palette as sidebar) + `<PresenceIndicator>` avatars
- Right: nothing (clean)

A `<Separator />` sits between the header block and the formatting toolbar.

### 4b. Formatting toolbar

Same `EditorToolbar.tsx` component with **visual groups** separated by `<Separator orientation="vertical" className="h-6" />`:

| Group | Buttons |
|-------|---------|
| Marks | Bold, Italic, Strikethrough, Code |
| Headings | H1, H2, H3 |
| Lists | Bullet list, Ordered list |
| Blocks | Blockquote, Horizontal rule |

Toolbar background: `bg-muted/40 border-b px-2 py-1` — sits flush below the header separator, no rounded top.

### 4c. Editor area

```
<div className="flex-1 overflow-auto p-6">
  <div className="mx-auto max-w-2xl">
    <div className="bg-card rounded-lg shadow-sm border min-h-[calc(100vh-280px)] p-8">
      <EditorContent />
    </div>
    <p className="mt-2 text-right text-xs text-muted-foreground">
      {wordCount} words · auto-saved
    </p>
  </div>
</div>
```

Word count: computed from `editor.getText().trim().split(/\s+/).filter(Boolean).length` inside a `useEffect` on editor updates. Displayed below the card, right-aligned.

"auto-saved" text changes to "saving…" while `isPending` from the Yjs push debounce. Since the sync engine doesn't expose a pending state directly, use a simple derived state: set `saving=true` on every doc update, `saving=false` 1.5s after the last update.

### 4d. View-only mode

The read-only `<Alert>` banner stays. Toolbar is hidden. The "More" dropdown still shows Summarize (viewers can summarize per existing RBAC) and hides Version History restore buttons (already handled by `canEdit` prop).

---

## 5. Dashboard (Home Page)

**File:** `src/app/(app)/page.tsx`

Two sections in the main content area:

**Welcome block (top, centered):**
```
⬡  (logo mark, large)
Welcome back, {name}
Select a document from the sidebar or create a new one.
[+ New Document]   ← same createDocumentAction form
```

**Recent documents list (below separator):**
- Label: "RECENT" (text-xs uppercase muted)
- Same `memberships` data already fetched, now with:
  - File icon + title (font-medium)
  - Role badge (same pill palette)
  - Relative time (`formatRelativeTime(membership.document.updatedAt)`)
- Clicking navigates to `/documents/${id}` — same as before
- Empty state (no documents yet): just the welcome block, no "Recent" section

**`formatRelativeTime` utility** (`src/lib/utils/time.ts`):
```ts
export function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86_400_000);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
```

---

## 6. Auth Pages

**Files:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`

`(auth)/layout.tsx` renders:
```tsx
<div className="min-h-screen bg-background flex items-center justify-center p-4">
  {children}
</div>
```

Card markup: same shadcn `Input`/`Label`/`Button`/`Alert` components as current. Only addition: a logo mark (`⬡ Collab`) above the "Log In" / "Register" heading. Card gets `max-w-sm w-full`.

No sidebar, no header, no footer on these pages.

---

## 7. Dark Mode

**Package:** `next-themes` (add to dependencies)

**Root layout:** wrap `{children}` in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`.

**Toggle component:** `src/components/ThemeToggle.tsx` — icon button that calls `useTheme()` from `next-themes`, swaps Sun/Moon icon based on resolved theme.

Placed in sidebar footer row (next to logout button).

**No CSS changes needed** — `globals.css` already has complete `:root` (light) and `.dark` token sets.

---

## 8. New shadcn Components Needed

Run before implementing:
```
pnpm dlx shadcn@latest add separator dropdown-menu sheet avatar
```

And install `next-themes`:
```
pnpm add next-themes
```

---

## 9. Files Created / Modified Summary

| Action | File |
|--------|------|
| Shrink | `src/app/layout.tsx` |
| Create | `src/app/(auth)/layout.tsx` |
| Move   | `src/app/login/page.tsx` → `src/app/(auth)/login/page.tsx` |
| Move   | `src/app/register/page.tsx` → `src/app/(auth)/register/page.tsx` |
| Create | `src/app/(app)/layout.tsx` |
| Move   | `src/app/page.tsx` → `src/app/(app)/page.tsx` |
| Move   | `src/app/documents/[id]/page.tsx` → `src/app/(app)/documents/[id]/page.tsx` |
| Create | `src/components/AppSidebar.tsx` |
| Create | `src/components/SidebarDocList.tsx` |
| Create | `src/components/ThemeToggle.tsx` |
| Modify | `src/components/EditorToolbar.tsx` (add separators) |
| Modify | `src/components/Editor.tsx` (word count state) |
| Modify | `src/app/(app)/documents/[id]/page.tsx` (new header layout, dropdown menu) |
| Delete | `src/components/Footer.tsx` |
| Create | `src/lib/utils/time.ts` |

---

## 10. Out of Scope

- No changes to sync engine, CRDT, auth logic, or database schema
- No changes to server actions
- No new shadcn components beyond those listed in §8
- No animation library — `tw-animate-css` already present for any transitions
- Vitest tests: no new tests (UI is tested manually; existing sync/membership tests unchanged)

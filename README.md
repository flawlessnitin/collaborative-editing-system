# Collaborative Document Editor

A local-first, real-time collaborative document editor with offline sync, deterministic
conflict resolution, and version history — built for the House of Edtech full-stack
take-home assignment.

**Live deployment:** https://doc.flawlessnitin.com

## Stack

- **Next.js 16** (App Router, TypeScript) — Server Actions for mutations, Route Handlers
  for the sync/presence protocols.
- **Yjs** — CRDT core. All document content is a `Y.XmlFragment`; merges are commutative
  and associative, so two clients can apply updates in any order and converge on the same
  state.
- **Tiptap 3** (`@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-caret`)
  — the editor UI, bound directly to the Yjs document.
- **y-indexeddb** — local persistence. The browser's copy of the document is the source of
  truth for editing; the server is a sync target, not a blocking dependency.
- **PostgreSQL (Neon) + Prisma 7** — durable storage, accessed through a driver adapter
  (`@prisma/adapter-neon`) since Prisma 7 no longer manages connections from
  `schema.prisma` directly.
- **Hand-rolled JWT auth** (`jose` + `bcryptjs`, httpOnly cookie) — no auth library;
  written explicitly to control exactly what's verified, when.
- **Resend** — invite-collaborator email notifications.
- **Tailwind + shadcn/ui**.

## Why HTTP polling instead of WebSockets

Vercel functions are serverless and don't hold long-lived connections to browsers, so a
traditional WebSocket relay isn't viable on this deployment target without extra
infrastructure (a separate always-on process). Instead, sync is a plain HTTP push/pull
protocol:

- The client pushes queued local updates, then pulls anything new since its last-seen
  cursor (`seq`, an opaque `DocUpdate` row id).
- A debounced push fires ~800ms after the user stops typing, plus a 3s interval poll as a
  fallback, plus an `online` event listener to catch reconnects immediately.
- The same poll cadence carries Yjs **awareness** updates (cursor position, name, color)
  alongside a liveness heartbeat, giving named live cursors and a "currently active"
  list without a second transport.

This trades sub-100ms cursor latency for deployability on serverless infra — a deliberate
scope decision, not an oversight.

## Local-first architecture & sync engine

1. Every keystroke mutates the in-memory `Y.Doc` directly — the editor never waits on the
   network.
2. `y-indexeddb` persists the `Y.Doc` to the browser automatically, so closing the tab or
   going offline loses nothing.
3. Every local update is also appended to an IndexedDB **outbox** (`src/lib/outbox.ts`),
   scoped per document.
4. The sync engine (`src/lib/sync/engine.ts`) drains the outbox over HTTP, only removing
   entries once the server has acknowledged them — never optimistically.
5. On pull, the engine tags applied updates with origin `"remote"` so the update listener
   that feeds the outbox doesn't re-queue them, which would otherwise loop the same bytes
   back to the server forever.

### Conflict resolution

Conflicts are resolved by the CRDT itself, not by the server. The server's only merge
responsibility (`src/lib/sync/merge.ts`) is: load the document's last compacted state into
a scratch `Y.Doc`, apply every incoming update, and re-encode. Because Yjs updates are
commutative, this is safe to do concurrently for different documents and never needs
locking — two collaborators editing the same paragraph offline will both have their
changes preserved when they reconnect, regardless of order.

## Version history & safe restore

Capturing a version (`src/lib/versions/actions.ts`) snapshots the current encoded state
into a `Version` row.

Restoring a version is **not** an overwrite. `src/lib/sync/restore.ts` reconstructs the
current document and the target snapshot in two scratch `Y.Doc`s, clones the snapshot's
content into the current document's fragment inside a single transaction, and encodes
*only the diff* (`Y.encodeStateAsUpdate(currentDoc, beforeRestoreVector)`). That diff is
written into the same `DocUpdate` log a normal edit would use, so:

- Other connected collaborators receive the restore as a regular pulled update — no
  special-casing on the client.
- A collaborator who made an offline edit *before* the restore happened still merges
  cleanly afterward, because the restore is itself just another CRDT update, not a
  destructive reset.

## Security

**Request fortress on every sync push** (`src/app/api/documents/[id]/sync/route.ts`):

1. Reject by `Content-Length` before the body is ever read — the cheapest possible defense
   against a malformed-payload OOM attempt, since it never buffers an oversized body into
   memory in the first place.
2. Authenticate (JWT from httpOnly cookie).
3. Authorize via `assertMembership`, ranked numerically (`viewer: 1, editor: 2, owner: 3`)
   — **not** string comparison, which sorts alphabetically and would silently let a viewer
   pass an editor-minimum check (`"editor" < "owner" < "viewer"`).
4. Validate shape with Zod before touching any binary data.
5. Decode base64 → bytes, then let `Y.applyUpdate` itself reject structurally invalid CRDT
   updates.
6. Persist the new compacted state and the raw update log entries in one
   `prisma.$transaction` — partial writes can't corrupt the document.

**Tenant isolation** is enforced by scoping every query through `assertMembership` rather
than relying on row-level security in Postgres — every document read/write requires an
explicit membership row for that user and that document, checked server-side on every
request (never trusted from the client).

**Role enforcement**: Viewers can pull (`GET`, requires `viewer`) but cannot push (`POST`,
requires `editor`) — enforced both server-side (403 on insufficient role) and in the UI
(the Tiptap editor is mounted with `editable: false` for viewers, so there's no dead-end
UX where a viewer types into an editor whose writes silently never sync).

## AI add-on

`src/lib/ai/summarize.ts` — a Server Action that sends the document's current plain text
to an LLM and returns a short summary, surfaced in the editor toolbar. Scoped
deliberately small given the time budget: it demonstrates the integration point (calling
out to a model, handling its failure modes without blocking the editor) rather than
building a larger AI feature surface.

## Testing

`pnpm test` runs the Vitest unit suite (`src/lib/**/__tests__/*.test.ts`), focused on the
properties that actually matter for a CRDT sync system — not coverage percentage:

- **`merge.test.ts`** — two clients editing offline from the same base state converge to
  identical content regardless of which update is applied first (CRDT commutativity);
  merging is idempotent; structurally malformed update bytes are rejected instead of
  corrupting state.
- **`restore.test.ts`** — restoring a version reproduces the snapshot's content exactly;
  and the critical safety property — a collaborator's offline edit, made *before* a
  restore they didn't know about, still merges in cleanly afterward with no data loss or
  thrown error.
- **`membership.test.ts`** — a regression test for a real bug caught during development:
  role comparisons must be numeric rank, not string comparison (`"editor" < "owner" <
  "viewer"` alphabetically, which would silently let a viewer pass an editor-only check).

Beyond this, the sync route's HTTP-level behavior (size cap, auth, zod validation,
concurrent push-after-restore) was verified with scripted end-to-end checks against the
live dev server during development rather than committed as integration tests — that's
the next highest-value addition given more time.

**True sub-second live cursors** are out of scope for the same reason described above —
a deliberate consequence of the serverless/no-WebSocket constraint, not an unsolved bug.

## Real-world scaling considerations

- **Document state growth.** The server stores both a compacted `state` snapshot and the
  full `DocUpdate` log. The compacted snapshot keeps the *hot path* (initial load) cheap
  regardless of how long a document has been edited; the log exists for the version-restore
  and incremental-pull paths. In production this log should eventually be pruned or
  periodically compacted past old version snapshots — not implemented here, flagged as a
  known next step.
- **Polling interval as a cost/latency knob.** The 3s sync interval is a deliberate
  trade-off; at higher collaborator counts per document this would need to move toward
  a real push channel (e.g. a small dedicated WebSocket/SSE service alongside the
  serverless API, or a provider like Pusher/Ably) rather than scaling polling frequency
  down, which scales request volume linearly with both users and documents.
- **CI/CD.** The GitHub repository is connected directly to Vercel — every push to `main`
  triggers a production deployment, and every other branch/PR gets its own preview
  deployment automatically.

## Local development

```bash
pnpm install
pnpm dev
```

Requires a `.env` with `DATABASE_URL`, `DIRECT_URL` (Neon pooled + direct connection
strings), `JWT_SECRET`, `RESEND_API_KEY`, `GEMINI_API_KEY`, and `NEXT_PUBLIC_APP_URL`.

```bash
pnpm test                      # run the unit suite
pnpm exec prisma migrate dev   # apply schema
```

## Author

Nitin Sahu — [GitHub](https://github.com/flawlessnitin) ·
[LinkedIn](https://linkedin.com/in/flawlessnitin)

import { NextRequest, NextResponse } from "next/server";
import { flattenError } from "zod";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import { syncPushSchema } from "@/lib/validations/sync";
import { mergeUpdatesIntoState, InvalidUpdateError } from "@/lib/sync/merge";
import prisma from "@/lib/prisma";

const MAX_BODY_BYTES = 1_000_000; // 1MB — cheap rejection before reading the body at all

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Size cap — reject before ever calling request.json(), which is what
  // would actually buffer the full body into memory.
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // 2. Authenticate
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId } = await params;

  // 3. Authorize — Viewers are members, just ranked below "editor"
  const membership = await assertMembership(session.userId, documentId, "editor");
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Validate payload shape — request.json() throws on unparseable JSON,
  // which would otherwise surface as an uncaught 500 instead of a clean 400.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const result = syncPushSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: flattenError(result.error) }, { status: 400 });
  }

  // 5. Decode base64 → binary, before attempting to apply anything.
  // Buffer.from(...) decodes the base64, but its type doesn't satisfy
  // Prisma's stricter Uint8Array<ArrayBuffer> Bytes type — wrapping in
  // `new Uint8Array(...)` copies it into a plain, cleanly-typed array.
  let decodedUpdates: Uint8Array<ArrayBuffer>[];
  try {
    decodedUpdates = result.data.updates.map(
      (update) => new Uint8Array(Buffer.from(update, "base64")),
    );
  } catch {
    return NextResponse.json({ error: "Invalid base64 encoding" }, { status: 400 });
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // 6. Decode-verify + merge — this is also where genuinely malformed Yjs
  // bytes get rejected, since Y.applyUpdate throws on invalid input.
  let merged: { state: Uint8Array<ArrayBuffer>; stateVector: Uint8Array<ArrayBuffer> };
  try {
    merged = mergeUpdatesIntoState(document.state, decodedUpdates);
  } catch (error) {
    if (error instanceof InvalidUpdateError) {
      return NextResponse.json({ error: "Malformed update" }, { status: 400 });
    }
    throw error;
  }

  // 7. Persist atomically — the document's new compacted state and the
  // individual update log entries land together, or not at all.
  await prisma.$transaction([
    prisma.document.update({
      where: { id: documentId },
      data: { state: merged.state, stateVector: merged.stateVector },
    }),
    ...decodedUpdates.map((update) =>
      prisma.docUpdate.create({
        data: {
          documentId,
          update,
          authorId: session.userId,
        },
      }),
    ),
  ]);

  return NextResponse.json({ success: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId } = await params;

  // Reading only requires viewer — pushing is what's restricted to editor+.
  const membership = await assertMembership(session.userId, documentId, "viewer");
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const sinceParam = request.nextUrl.searchParams.get("since");

  // No cursor yet (first sync) — send the compacted snapshot rather than
  // replaying the entire update log from the beginning.
  if (!sinceParam) {
    const latest = await prisma.docUpdate.findFirst({
      where: { documentId },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      updates: [Buffer.from(document.state).toString("base64")],
      seq: (latest?.id ?? BigInt(0)).toString(),
    });
  }

  const since = BigInt(sinceParam);
  const pending = await prisma.docUpdate.findMany({
    where: { documentId, id: { gt: since } },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    updates: pending.map((entry) => Buffer.from(entry.update).toString("base64")),
    seq: (pending.at(-1)?.id ?? since).toString(),
  });
}

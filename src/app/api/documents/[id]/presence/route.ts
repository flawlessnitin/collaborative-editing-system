import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { assertMembership } from "@/lib/membership";
import prisma from "@/lib/prisma";

// A user counts as "active" if their last heartbeat was within this window.
// Heartbeats fire every 3s on the client, so 10s tolerates a couple of
// missed beats (a slow network tick, a tab briefly backgrounded) without
// flickering someone in and out of the list.
const ACTIVE_WINDOW_MS = 10_000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId } = await params;

  const membership = await assertMembership(session.userId, documentId, "viewer");
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Awareness payload is optional — the plain heartbeat (no body) still
  // works and just refreshes lastSeenAt without touching a prior awareness
  // value, since it's only included in the update when actually provided.
  let awarenessBytes: Uint8Array<ArrayBuffer> | undefined;
  const contentLength = request.headers.get("content-length");
  if (contentLength && contentLength !== "0") {
    const body = await request.json().catch(() => null);
    if (typeof body?.awareness === "string") {
      awarenessBytes = new Uint8Array(Buffer.from(body.awareness, "base64"));
    }
  }

  await prisma.presence.upsert({
    where: { documentId_userId: { documentId, userId: session.userId } },
    create: { documentId, userId: session.userId, awareness: awarenessBytes },
    update: awarenessBytes ? { awareness: awarenessBytes } : {},
  });

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

  const membership = await assertMembership(session.userId, documentId, "viewer");
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const active = await prisma.presence.findMany({
    where: {
      documentId,
      lastSeenAt: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) },
      // Excludes the caller's own row — a client never needs its own
      // awareness state echoed back to it.
      userId: { not: session.userId },
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    users: active.map((entry) => ({
      userId: entry.userId,
      name: entry.user.name,
      awareness: entry.awareness ? Buffer.from(entry.awareness).toString("base64") : null,
    })),
  });
}

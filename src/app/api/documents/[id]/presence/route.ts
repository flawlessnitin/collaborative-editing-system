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
  _request: NextRequest,
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

  await prisma.presence.upsert({
    where: { documentId_userId: { documentId, userId: session.userId } },
    create: { documentId, userId: session.userId },
    update: {}, // lastSeenAt is @updatedAt — touching the row is enough
  });

  return NextResponse.json({ success: true });
}

export async function GET(
  _request: NextRequest,
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
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    users: active.map((entry) => ({ userId: entry.userId, name: entry.user.name })),
  });
}

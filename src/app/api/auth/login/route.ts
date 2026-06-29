import { NextRequest, NextResponse } from "next/server";
import { flattenError } from "zod";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations/auth";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: flattenError(result.error) },
      { status: 400 },
    );
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberately the same error for "no such user" and "wrong password" —
  // distinguishing them lets an attacker enumerate which emails are registered.
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSession(user.id);

  const response = NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}

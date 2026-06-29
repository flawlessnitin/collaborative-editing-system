"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

async function setSessionCookie(userId: string) {
  const token = await createSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function loginAction(formData: FormData) {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Same error for "no such user" and "wrong password" — distinguishing
  // them would let an attacker enumerate which emails are registered.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect(`/login?error=${encodeURIComponent("Invalid email or password")}`);
  }

  await setSessionCookie(user.id);
  redirect("/");
}

export async function registerAction(formData: FormData) {
  const result = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/register?error=${encodeURIComponent(message)}`);
  }

  const { email, password, name } = result.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    redirect(`/register?error=${encodeURIComponent("A user with this email already exists")}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  await setSessionCookie(user.id);
  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

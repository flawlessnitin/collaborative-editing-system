import { NextRequest, NextResponse } from "next/server";
import { flattenError } from "zod";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: flattenError(result.error) },
      { status: 400 },
    );
  }

  const { email, password, name } = result.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  return NextResponse.json(
    { id: user.id, email: user.email, name: user.name },
    { status: 201 },
  );
}

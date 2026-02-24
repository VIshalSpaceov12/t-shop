import { NextRequest, NextResponse } from "next/server";
import { getSessionOrBearer } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(dbUser);
}

export async function PUT(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = profileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: result.data.name,
      phone: result.data.phone || null,
    },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

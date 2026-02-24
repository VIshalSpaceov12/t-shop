import { NextRequest, NextResponse } from "next/server";
import { getSessionOrBearer } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { isDefault: "desc" },
  });

  return NextResponse.json(addresses);
}

export async function POST(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = addressSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = result.data;

  // If marking as default, unset other defaults
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      ...data,
      userId: user.id,
      isDefault: data.isDefault ?? false,
    },
  });

  return NextResponse.json(address, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrBearer } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== user.id) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
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

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.address.update({
    where: { id },
    data: { ...data, isDefault: data.isDefault ?? false },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== user.id) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // Check if address is linked to orders
  const ordersCount = await prisma.order.count({
    where: { addressId: id },
  });

  if (ordersCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete address linked to orders" },
      { status: 400 }
    );
  }

  await prisma.address.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

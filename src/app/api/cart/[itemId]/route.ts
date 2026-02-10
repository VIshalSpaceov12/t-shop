import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const { quantity } = await request.json();

  if (!quantity || quantity < 1) {
    return NextResponse.json(
      { error: "Quantity must be at least 1" },
      { status: 400 }
    );
  }

  // Find the cart item and verify ownership
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      cart: { select: { userId: true } },
      variant: { select: { stock: true } },
    },
  });

  if (!cartItem || cartItem.cart.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Cart item not found" },
      { status: 404 }
    );
  }

  if (quantity > cartItem.variant.stock) {
    return NextResponse.json(
      { error: "Not enough stock available" },
      { status: 400 }
    );
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;

  // Find the cart item and verify ownership
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: { select: { userId: true } } },
  });

  if (!cartItem || cartItem.cart.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Cart item not found" },
      { status: 404 }
    );
  }

  await prisma.cartItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}

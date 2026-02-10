import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  brand: true,
                  sellingPrice: true,
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { id: "desc" },
      },
    },
  });

  if (!cart) {
    return NextResponse.json({ items: [], itemCount: 0 });
  }

  const items = cart.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    variant: {
      id: item.variant.id,
      size: item.variant.size,
      color: item.variant.color,
      colorHex: item.variant.colorHex,
      stock: item.variant.stock,
    },
    product: item.variant.product,
  }));

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return NextResponse.json({ items, itemCount });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { variantId, quantity = 1 } = body;

  if (!variantId) {
    return NextResponse.json(
      { error: "Variant ID is required" },
      { status: 400 }
    );
  }

  // Verify variant exists and has stock
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  if (variant.stock < quantity) {
    return NextResponse.json(
      { error: "Not enough stock available" },
      { status: 400 }
    );
  }

  // Get or create cart
  let cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: session.user.id },
    });
  }

  // Upsert cart item
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_variantId: { cartId: cart.id, variantId },
    },
  });

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (newQty > variant.stock) {
      return NextResponse.json(
        { error: "Not enough stock available" },
        { status: 400 }
      );
    }
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, variantId, quantity },
    });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

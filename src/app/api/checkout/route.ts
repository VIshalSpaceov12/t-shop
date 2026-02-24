import { NextRequest, NextResponse } from "next/server";
import { getSessionOrBearer } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { addressId } = await request.json();

  if (!addressId) {
    return NextResponse.json(
      { error: "Please select a delivery address" },
      { status: 400 }
    );
  }

  // Verify address belongs to user
  const address = await prisma.address.findUnique({
    where: { id: addressId },
  });

  if (!address || address.userId !== user.id) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  // Get cart with items
  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { sellingPrice: true } },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Verify stock availability for all items
  for (const item of cart.items) {
    if (item.variant.stock < item.quantity) {
      return NextResponse.json(
        {
          error: `Not enough stock for ${item.variant.color} ${item.variant.size}. Available: ${item.variant.stock}`,
        },
        { status: 400 }
      );
    }
  }

  // Calculate total
  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.variant.product.sellingPrice * item.quantity,
    0
  );

  // Create order in a transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        userId: user.id,
        addressId,
        totalAmount,
        status: "PENDING",
        paymentMethod: "COD",
        paymentStatus: "UNPAID",
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.variant.product.sellingPrice,
          })),
        },
      },
    });

    // Decrement stock
    for (const item of cart.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Clear cart items
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return newOrder;
  });

  return NextResponse.json({ orderId: order.id }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrBearer } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wishlist = await prisma.wishlist.findMany({
    where: { userId: user.id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          brand: true,
          basePrice: true,
          sellingPrice: true,
          discount: true,
          images: { orderBy: { sortOrder: "asc" }, take: 2 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = wishlist.map((w) => ({
    id: w.id,
    product: w.product,
    createdAt: w.createdAt,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await request.json();

  if (!productId) {
    return NextResponse.json(
      { error: "Product ID is required" },
      { status: 400 }
    );
  }

  // Toggle: if exists, remove; if not, add
  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_productId: { userId: user.id, productId },
    },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return NextResponse.json({ wishlisted: false });
  }

  await prisma.wishlist.create({
    data: { userId: user.id, productId },
  });

  return NextResponse.json({ wishlisted: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  if (!productId) {
    return NextResponse.json(
      { error: "Product ID is required" },
      { status: 400 }
    );
  }

  await prisma.wishlist.deleteMany({
    where: { userId: user.id, productId },
  });

  return NextResponse.json({ success: true });
}

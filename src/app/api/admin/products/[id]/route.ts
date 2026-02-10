import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const result = productSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, description, brand, basePrice, sellingPrice, categoryId, gender, status: productStatus } = result.data;
  const slug = slugify(name);

  // Check for duplicate slug (exclude current product)
  const existing = await prisma.product.findFirst({
    where: { slug, NOT: { id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A product with this name already exists" },
      { status: 400 }
    );
  }

  const discount = Math.round(((basePrice - sellingPrice) / basePrice) * 100);

  const product = await prisma.product.update({
    where: { id },
    data: {
      name,
      slug,
      description: description || null,
      brand: brand || "Shop",
      basePrice,
      sellingPrice,
      discount,
      categoryId,
      gender,
      status: productStatus || undefined,
    },
  });

  // Update variants if provided
  if (body.variants) {
    await prisma.productVariant.deleteMany({ where: { productId: id } });
    if (body.variants.length > 0) {
      await prisma.productVariant.createMany({
        data: body.variants.map((v: { size: string; color: string; colorHex: string; sku: string; stock: number }) => ({
          productId: id,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex || "#000000",
          sku: v.sku,
          stock: v.stock || 0,
        })),
      });
    }
  }

  // Update images if provided
  if (body.images) {
    await prisma.productImage.deleteMany({ where: { productId: id } });
    if (body.images.length > 0) {
      await prisma.productImage.createMany({
        data: body.images.map((img: { url: string; altText?: string }, i: number) => ({
          productId: id,
          url: img.url,
          altText: img.altText || product.name,
          sortOrder: i,
          isPrimary: i === 0,
        })),
      });
    }
  }

  return NextResponse.json(product);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if product has orders (through variants)
  const orderCount = await prisma.orderItem.count({
    where: { variant: { productId: id } },
  });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete: product has been ordered" },
      { status: 400 }
    );
  }

  // Delete related data first
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.productVariant.deleteMany({ where: { productId: id } });
  await prisma.cartItem.deleteMany({ where: { variant: { productId: id } } });
  await prisma.wishlist.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

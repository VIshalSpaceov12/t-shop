import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrBearer } from "@/lib/mobile-auth";
import { categorySchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionOrBearer(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = categorySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, parentId, image } = result.data;
  const slug = slugify(name);

  // Check for duplicate slug (exclude current category)
  const existing = await prisma.category.findFirst({
    where: { slug, NOT: { id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A category with this name already exists" },
      { status: 400 }
    );
  }

  // Prevent setting self as parent
  if (parentId === id) {
    return NextResponse.json(
      { error: "A category cannot be its own parent" },
      { status: 400 }
    );
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      slug,
      image: image || null,
      parentId: parentId || null,
    },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionOrBearer(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if category has products
  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });
  if (productCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${productCount} products use this category` },
      { status: 400 }
    );
  }

  // Check if category has children
  const childCount = await prisma.category.count({
    where: { parentId: id },
  });
  if (childCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${childCount} subcategories exist under this category` },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrBearer } from "@/lib/mobile-auth";
import { productSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) {
    where.status = status;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1 },
        _count: { select: { variants: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    total,
    pages: Math.ceil(total / limit),
    page,
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Check for duplicate slug
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "A product with this name already exists" },
      { status: 400 }
    );
  }

  const discount = Math.round(((basePrice - sellingPrice) / basePrice) * 100);

  const product = await prisma.product.create({
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
      status: productStatus || "DRAFT",
    },
  });

  // Create variants if provided
  if (body.variants?.length) {
    await prisma.productVariant.createMany({
      data: body.variants.map((v: { size: string; color: string; colorHex: string; sku: string; stock: number }) => ({
        productId: product.id,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex || "#000000",
        sku: v.sku,
        stock: v.stock || 0,
      })),
    });
  }

  // Create images if provided
  if (body.images?.length) {
    await prisma.productImage.createMany({
      data: body.images.map((img: { url: string; altText?: string }, i: number) => ({
        productId: product.id,
        url: img.url,
        altText: img.altText || product.name,
        sortOrder: i,
        isPrimary: i === 0,
      })),
    });
  }

  return NextResponse.json(product, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // ---- Fetch product with full details ----
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
            parent: { select: { name: true, slug: true } },
          },
        },
        variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // ---- Check wishlist (optional auth) ----
    let isWishlisted = false;
    const user = await getMobileUser(req);
    if (user) {
      const wishlistEntry = await prisma.wishlist.findUnique({
        where: {
          userId_productId: {
            userId: user.id,
            productId: product.id,
          },
        },
      });
      isWishlisted = !!wishlistEntry;
    }

    // ---- Fetch similar products ----
    const similarProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        status: "ACTIVE",
        id: { not: product.id },
      },
      include: {
        images: { take: 2, orderBy: { sortOrder: "asc" } },
      },
      take: 4,
    });

    return NextResponse.json({
      product,
      isWishlisted,
      similarProducts,
    });
  } catch (error) {
    console.error("[MOBILE_PRODUCT_DETAIL]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, Gender } from "@/generated/prisma/client";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || String(PRODUCTS_PER_PAGE), 10))
    );
    const search = searchParams.get("search") || "";
    const gender = searchParams.get("gender") || "";
    const category = searchParams.get("category") || "";
    const sort = searchParams.get("sort") || "newest";

    const skip = (page - 1) * limit;

    // ---- Build WHERE clause ----
    const where: Prisma.ProductWhereInput = {
      status: "ACTIVE",
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (gender) {
      const validGenders = Object.values(Gender);
      const upperGender = gender.toUpperCase();
      if (validGenders.includes(upperGender as Gender)) {
        where.gender = upperGender as Gender;
      }
    }

    if (category) {
      const slugs = category
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (slugs.length > 0) {
        where.category = { slug: { in: slugs } };
      }
    }

    // ---- Build ORDER BY clause ----
    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sort) {
      case "price_asc":
        orderBy = { sellingPrice: "asc" };
        break;
      case "price_desc":
        orderBy = { sellingPrice: "desc" };
        break;
      case "discount":
        orderBy = { discount: "desc" };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // ---- Execute queries in parallel ----
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { take: 2, orderBy: { sortOrder: "asc" } },
          category: { select: { name: true, slug: true } },
        },
        orderBy,
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
  } catch (error) {
    console.error("[MOBILE_PRODUCTS_LIST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

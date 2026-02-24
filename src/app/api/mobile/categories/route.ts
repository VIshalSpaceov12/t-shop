import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: { not: null } },
      orderBy: { name: "asc" },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

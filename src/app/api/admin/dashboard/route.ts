import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrBearer } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrBearer(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalProducts, activeProducts, totalCategories, totalOrders, pendingOrders, totalUsers, revenueResult] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.category.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);

    return NextResponse.json({
      totalProducts,
      activeProducts,
      totalCategories,
      totalOrders,
      pendingOrders,
      totalUsers,
      totalRevenue: revenueResult._sum.totalAmount || 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

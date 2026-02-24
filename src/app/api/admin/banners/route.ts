import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrBearer } from "@/lib/mobile-auth";
import { bannerSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banners = await prisma.banner.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(banners);
}

export async function POST(request: NextRequest) {
  const user = await getSessionOrBearer(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = bannerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const banner = await prisma.banner.create({ data: result.data });

  return NextResponse.json(banner, { status: 201 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signMobileJwt, verifyMobileJwt } from "@/lib/mobile-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken || typeof refreshToken !== "string") {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    const payload = await verifyMobileJwt(refreshToken);
    if (!payload || payload.type !== "refresh" || !payload.sub) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // Verify the user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // Issue new access token — 24 hours
    const token = await signMobileJwt(
      { sub: user.id, role: user.role },
      24 * 60 * 60
    );

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

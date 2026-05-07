import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function PUT(
  _request: NextRequest,
  ctx: RouteContext<"/api/alerts/[id]/resolve">,
) {
  try {
    const { id } = await ctx.params;
    const alert = await prisma.alert.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
    return Response.json({ alert });
  } catch (error) {
    console.error("PUT /api/alerts/[id]/resolve failed", error);
    return Response.json(
      { error: "Failed to resolve alert" },
      { status: 500 },
    );
  }
}

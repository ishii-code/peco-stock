import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/stocktakes/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const stocktake = await prisma.stocktake.findUnique({
      where: { id },
      include: { entries: true },
    });
    if (!stocktake) {
      return Response.json({ error: "Stocktake not found" }, { status: 404 });
    }
    return Response.json({ stocktake });
  } catch (error) {
    console.error("GET /api/stocktakes/[id] failed", error);
    return Response.json(
      { error: "Failed to fetch stocktake" },
      { status: 500 },
    );
  }
}

import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: { select: { id: true, name: true, unit: true, category: true } },
          },
        },
      },
    });
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    return Response.json({ order });
  } catch (error) {
    console.error("GET /api/orders/[id] failed", error);
    return Response.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

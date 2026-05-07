import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function PUT(
  _request: NextRequest,
  ctx: RouteContext<"/api/orders/[id]/receive">,
) {
  try {
    const { id } = await ctx.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status === "received") {
      return Response.json(
        { error: "Order already received" },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const oi of order.items) {
        await tx.transaction.create({
          data: {
            itemId: oi.itemId,
            clinicId: order.clinicId,
            type: "in",
            quantity: oi.quantity,
            note: `発注 ${order.id} 受領`,
          },
        });
        const existing = await tx.inventory.findFirst({
          where: { itemId: oi.itemId, clinicId: order.clinicId, lotNumber: null },
        });
        if (existing) {
          await tx.inventory.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + oi.quantity },
          });
        } else {
          await tx.inventory.create({
            data: {
              itemId: oi.itemId,
              clinicId: order.clinicId,
              quantity: oi.quantity,
            },
          });
        }
      }
      return tx.order.update({
        where: { id },
        data: { status: "received", receivedAt: new Date() },
        include: {
          items: {
            include: {
              item: {
                select: { id: true, name: true, unit: true, category: true },
              },
            },
          },
        },
      });
    });

    return Response.json({ order: updated });
  } catch (error) {
    console.error("PUT /api/orders/[id]/receive failed", error);
    return Response.json(
      { error: "Failed to receive order" },
      { status: 500 },
    );
  }
}

import { sendOrderEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

type SendBody = {
  supplierEmail?: unknown;
};

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/orders/[id]/send">,
) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as SendBody;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { item: true } },
      },
    });
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "draft") {
      return Response.json(
        { error: `Order is already ${order.status}` },
        { status: 409 },
      );
    }

    const recipient =
      typeof body.supplierEmail === "string" && body.supplierEmail.trim() !== ""
        ? body.supplierEmail.trim()
        : order.supplierEmail ?? "";

    if (!recipient) {
      return Response.json(
        { error: "supplierEmail is required to send" },
        { status: 400 },
      );
    }

    const sendResult = await sendOrderEmail(
      { id: order.id, note: order.note, createdAt: order.createdAt },
      order.items.map((it) => ({
        itemName: it.item.name,
        unit: it.item.unit,
        quantity: it.quantity,
        price: it.price,
      })),
      recipient,
    );

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "sent",
        sentAt: new Date(),
        supplierEmail: recipient,
      },
      include: {
        items: {
          include: {
            item: { select: { id: true, name: true, unit: true, category: true } },
          },
        },
      },
    });

    return Response.json({ order: updated, email: sendResult });
  } catch (error) {
    console.error("PUT /api/orders/[id]/send failed", error);
    return Response.json({ error: "Failed to send order" }, { status: 500 });
  }
}

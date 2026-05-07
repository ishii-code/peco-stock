import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const orders = await prisma.order.findMany({
      where: {
        ...(clinicId ? { clinicId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        items: {
          include: {
            item: { select: { id: true, name: true, unit: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ orders });
  } catch (error) {
    console.error("GET /api/orders failed", error);
    return Response.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

type CreateOrderBody = {
  clinicId?: unknown;
  supplierEmail?: unknown;
  note?: unknown;
  items?: unknown;
};

type OrderItemInput = {
  itemId: string;
  quantity: number;
  price: number | null;
};

function parseItems(value: unknown): OrderItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: OrderItemInput[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.itemId !== "string" || r.itemId.trim() === "") return null;
    if (typeof r.quantity !== "number" || !Number.isFinite(r.quantity) || r.quantity <= 0)
      return null;
    out.push({
      itemId: r.itemId,
      quantity: r.quantity,
      price: typeof r.price === "number" ? r.price : null,
    });
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderBody;
    if (typeof body.clinicId !== "string" || body.clinicId.trim() === "") {
      return Response.json({ error: "clinicId is required" }, { status: 400 });
    }
    const items = parseItems(body.items);
    if (!items) {
      return Response.json(
        { error: "items must be a non-empty array of {itemId, quantity, price?}" },
        { status: 400 },
      );
    }

    const order = await prisma.order.create({
      data: {
        clinicId: body.clinicId,
        supplierEmail:
          typeof body.supplierEmail === "string" ? body.supplierEmail : null,
        note: typeof body.note === "string" ? body.note : null,
        items: {
          create: items.map((it) => ({
            itemId: it.itemId,
            quantity: it.quantity,
            price: it.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            item: { select: { id: true, name: true, unit: true, category: true } },
          },
        },
      },
    });

    return Response.json({ order }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders failed", error);
    return Response.json({ error: "Failed to create order" }, { status: 500 });
  }
}

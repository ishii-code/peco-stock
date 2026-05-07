import { prisma } from "@/lib/prisma";
import {
  parsePrice,
  parseQuantity,
  parseRequiredString,
} from "@/lib/validation";
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

const MAX_ORDER_ITEMS = 500;

function parseItems(
  value: unknown,
): { ok: true; value: OrderItemInput[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "items must be a non-empty array" };
  }
  if (value.length > MAX_ORDER_ITEMS) {
    return { ok: false, error: `items exceeds maximum (${MAX_ORDER_ITEMS})` };
  }
  const out: OrderItemInput[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "each item must be an object" };
    }
    const r = raw as Record<string, unknown>;
    const idParsed = parseRequiredString(r.itemId, "items[].itemId", 64);
    if (!idParsed.ok) return { ok: false, error: idParsed.error };
    const qtyParsed = parseQuantity(r.quantity, "items[].quantity", {
      positive: true,
    });
    if (!qtyParsed.ok) return { ok: false, error: qtyParsed.error };
    const priceParsed = parsePrice(r.price, "items[].price");
    if (!priceParsed.ok) return { ok: false, error: priceParsed.error };
    out.push({
      itemId: idParsed.value,
      quantity: qtyParsed.value,
      price: priceParsed.value,
    });
  }
  return { ok: true, value: out };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderBody;
    const clinicIdParsed = parseRequiredString(body.clinicId, "clinicId", 64);
    if (!clinicIdParsed.ok) {
      return Response.json({ error: clinicIdParsed.error }, { status: 400 });
    }
    const itemsParsed = parseItems(body.items);
    if (!itemsParsed.ok) {
      return Response.json({ error: itemsParsed.error }, { status: 400 });
    }
    const items = itemsParsed.value;

    const order = await prisma.order.create({
      data: {
        clinicId: clinicIdParsed.value,
        supplierEmail:
          typeof body.supplierEmail === "string"
            ? body.supplierEmail.slice(0, 200)
            : null,
        note:
          typeof body.note === "string" ? body.note.slice(0, 1000) : null,
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

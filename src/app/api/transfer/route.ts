import { prisma } from "@/lib/prisma";
import { parseQuantity, parseRequiredString } from "@/lib/validation";
import type { NextRequest } from "next/server";

const MAX_TRANSFER_ITEMS = 200;

type TransferBody = {
  fromClinicId?: unknown;
  toClinicId?: unknown;
  items?: unknown;
  note?: unknown;
};

type TransferItemInput = {
  itemId: string;
  quantity: number;
};

function parseItems(
  value: unknown,
): { ok: true; value: TransferItemInput[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "items must be a non-empty array" };
  }
  if (value.length > MAX_TRANSFER_ITEMS) {
    return { ok: false, error: `items exceeds maximum (${MAX_TRANSFER_ITEMS})` };
  }
  const out: TransferItemInput[] = [];
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
    out.push({ itemId: idParsed.value, quantity: qtyParsed.value });
  }
  return { ok: true, value: out };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId");
    const transactions = await prisma.transaction.findMany({
      where: {
        type: "move",
        ...(clinicId ? { clinicId } : {}),
      },
      include: { item: { select: { id: true, name: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ transfers: transactions });
  } catch (error) {
    console.error("GET /api/transfer failed", error);
    return Response.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TransferBody;
    const fromParsed = parseRequiredString(body.fromClinicId, "fromClinicId", 64);
    if (!fromParsed.ok) {
      return Response.json({ error: fromParsed.error }, { status: 400 });
    }
    const toParsed = parseRequiredString(body.toClinicId, "toClinicId", 64);
    if (!toParsed.ok) {
      return Response.json({ error: toParsed.error }, { status: 400 });
    }
    if (fromParsed.value === toParsed.value) {
      return Response.json(
        { error: "fromClinicId and toClinicId must differ" },
        { status: 400 },
      );
    }
    const itemsParsed = parseItems(body.items);
    if (!itemsParsed.ok) {
      return Response.json({ error: itemsParsed.error }, { status: 400 });
    }
    const items = itemsParsed.value;
    const note =
      typeof body.note === "string" ? body.note.slice(0, 1000) : null;
    const fromClinicId = fromParsed.value;
    const toClinicId = toParsed.value;

    const itemIds = items.map((i) => i.itemId);
    const sourceInventory = await prisma.inventory.findMany({
      where: { clinicId: fromClinicId, itemId: { in: itemIds } },
      select: { itemId: true, quantity: true },
    });
    const sourceTotals = new Map<string, number>();
    for (const inv of sourceInventory) {
      sourceTotals.set(
        inv.itemId,
        (sourceTotals.get(inv.itemId) ?? 0) + inv.quantity,
      );
    }
    for (const it of items) {
      const have = sourceTotals.get(it.itemId) ?? 0;
      if (have < it.quantity) {
        return Response.json(
          {
            error: `Insufficient stock at source for itemId=${it.itemId} (have ${have}, want ${it.quantity})`,
          },
          { status: 409 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const created: Array<{ outId: string; inId: string }> = [];
      for (const it of items) {
        let remaining = it.quantity;
        const sourceLots = await tx.inventory.findMany({
          where: { clinicId: fromClinicId, itemId: it.itemId, quantity: { gt: 0 } },
          orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
        });
        for (const lot of sourceLots) {
          if (remaining <= 0) break;
          const used = Math.min(lot.quantity, remaining);
          await tx.inventory.update({
            where: { id: lot.id },
            data: { quantity: lot.quantity - used },
          });
          remaining -= used;
        }

        const outTx = await tx.transaction.create({
          data: {
            itemId: it.itemId,
            clinicId: fromClinicId,
            type: "move",
            quantity: it.quantity,
            note: note ? `→ ${toClinicId}: ${note}` : `→ ${toClinicId}`,
          },
        });

        const destExisting = await tx.inventory.findFirst({
          where: { clinicId: toClinicId, itemId: it.itemId, lotNumber: null },
        });
        if (destExisting) {
          await tx.inventory.update({
            where: { id: destExisting.id },
            data: { quantity: destExisting.quantity + it.quantity },
          });
        } else {
          await tx.inventory.create({
            data: {
              clinicId: toClinicId,
              itemId: it.itemId,
              quantity: it.quantity,
            },
          });
        }
        const inTx = await tx.transaction.create({
          data: {
            itemId: it.itemId,
            clinicId: toClinicId,
            type: "move",
            quantity: it.quantity,
            note: note ? `← ${fromClinicId}: ${note}` : `← ${fromClinicId}`,
          },
        });
        created.push({ outId: outTx.id, inId: inTx.id });
      }
      return created;
    });

    return Response.json({ transfers: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/transfer failed", error);
    return Response.json({ error: "Failed to transfer" }, { status: 500 });
  }
}

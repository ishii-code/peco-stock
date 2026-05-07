import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

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

function parseItems(value: unknown): TransferItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: TransferItemInput[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.itemId !== "string" || r.itemId.trim() === "") return null;
    if (typeof r.quantity !== "number" || !Number.isFinite(r.quantity) || r.quantity <= 0)
      return null;
    out.push({ itemId: r.itemId, quantity: r.quantity });
  }
  return out;
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
    if (typeof body.fromClinicId !== "string" || body.fromClinicId.trim() === "") {
      return Response.json({ error: "fromClinicId is required" }, { status: 400 });
    }
    if (typeof body.toClinicId !== "string" || body.toClinicId.trim() === "") {
      return Response.json({ error: "toClinicId is required" }, { status: 400 });
    }
    if (body.fromClinicId === body.toClinicId) {
      return Response.json(
        { error: "fromClinicId and toClinicId must differ" },
        { status: 400 },
      );
    }
    const items = parseItems(body.items);
    if (!items) {
      return Response.json(
        { error: "items must be a non-empty array of {itemId, quantity}" },
        { status: 400 },
      );
    }
    const note = typeof body.note === "string" ? body.note : null;
    const fromClinicId = body.fromClinicId;
    const toClinicId = body.toClinicId;

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

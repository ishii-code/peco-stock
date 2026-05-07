import { prisma } from "@/lib/prisma";
import { parseQuantity, parseRequiredString } from "@/lib/validation";
import type { NextRequest } from "next/server";

const MAX_STOCKTAKE_ENTRIES = 5000;

type CompleteBody = {
  entries?: unknown;
};

type EntryInput = {
  itemId: string;
  actual: number;
};

function parseEntries(
  value: unknown,
): { ok: true; value: EntryInput[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "entries must be an array" };
  }
  if (value.length > MAX_STOCKTAKE_ENTRIES) {
    return {
      ok: false,
      error: `entries exceeds maximum (${MAX_STOCKTAKE_ENTRIES})`,
    };
  }
  const out: EntryInput[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "each entry must be an object" };
    }
    const r = raw as Record<string, unknown>;
    const idParsed = parseRequiredString(r.itemId, "entries[].itemId", 64);
    if (!idParsed.ok) return { ok: false, error: idParsed.error };
    // actual stock count: 0 is legitimate (depleted), but no negatives or NaN
    const qtyParsed = parseQuantity(r.actual, "entries[].actual", {
      positive: false,
    });
    if (!qtyParsed.ok) return { ok: false, error: qtyParsed.error };
    out.push({ itemId: idParsed.value, actual: qtyParsed.value });
  }
  return { ok: true, value: out };
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/stocktakes/[id]/complete">,
) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as CompleteBody;
    const entriesParsed = parseEntries(body.entries);
    if (!entriesParsed.ok) {
      return Response.json({ error: entriesParsed.error }, { status: 400 });
    }
    const entries = entriesParsed.value;

    const stocktake = await prisma.stocktake.findUnique({ where: { id } });
    if (!stocktake) {
      return Response.json(
        { error: "Stocktake not found" },
        { status: 404 },
      );
    }
    if (stocktake.completedAt) {
      return Response.json(
        { error: "Stocktake already completed" },
        { status: 409 },
      );
    }

    const itemIds = entries.map((e) => e.itemId);
    const inventoryRows = await prisma.inventory.findMany({
      where: { clinicId: stocktake.clinicId, itemId: { in: itemIds } },
      select: { itemId: true, quantity: true },
    });
    const expectedByItem = new Map<string, number>();
    for (const row of inventoryRows) {
      expectedByItem.set(
        row.itemId,
        (expectedByItem.get(row.itemId) ?? 0) + row.quantity,
      );
    }

    const completed = await prisma.$transaction(async (tx) => {
      await tx.stocktakeEntry.deleteMany({ where: { stocktakeId: id } });
      await tx.stocktakeEntry.createMany({
        data: entries.map((entry) => {
          const expected = expectedByItem.get(entry.itemId) ?? 0;
          return {
            stocktakeId: id,
            itemId: entry.itemId,
            expected,
            actual: entry.actual,
            diff: entry.actual - expected,
          };
        }),
      });
      return tx.stocktake.update({
        where: { id },
        data: { completedAt: new Date() },
        include: { entries: true },
      });
    });

    const itemMeta = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true, unit: true, category: true },
    });
    const itemById = new Map(itemMeta.map((i) => [i.id, i]));
    const enrichedEntries = completed.entries.map((entry) => ({
      ...entry,
      item: itemById.get(entry.itemId) ?? null,
    }));

    return Response.json({
      stocktake: { ...completed, entries: enrichedEntries },
    });
  } catch (error) {
    console.error("PUT /api/stocktakes/[id]/complete failed", error);
    return Response.json(
      { error: "Failed to complete stocktake" },
      { status: 500 },
    );
  }
}

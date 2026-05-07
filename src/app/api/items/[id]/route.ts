import { prisma } from "@/lib/prisma";
import { parsePrice, parseStockLevel } from "@/lib/validation";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/items/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        inventory: { orderBy: { expiryDate: "asc" } },
      },
    });
    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }
    return Response.json({ item });
  } catch (error) {
    console.error("GET /api/items/[id] failed", error);
    return Response.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

const VALID_CATEGORIES = new Set(["medical", "consumable", "reagent"]);
const VALID_STORAGE = new Set(["normal", "refrigerated", "frozen"]);
const VALID_ANIMAL = new Set(["dog", "cat", "both"]);

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/items/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;

    const data: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (trimmed === "" || trimmed.length > 200) {
        return Response.json(
          { error: "name must be 1-200 characters" },
          { status: 400 },
        );
      }
      data.name = trimmed;
    }
    if (typeof body.category === "string") {
      if (!VALID_CATEGORIES.has(body.category)) {
        return Response.json({ error: "invalid category" }, { status: 400 });
      }
      data.category = body.category;
    }
    if (typeof body.unit === "string") {
      const trimmed = body.unit.trim();
      if (trimmed === "" || trimmed.length > 20) {
        return Response.json(
          { error: "unit must be 1-20 characters" },
          { status: 400 },
        );
      }
      data.unit = trimmed;
    }

    if (body.price !== undefined) {
      const parsed = parsePrice(body.price);
      if (!parsed.ok) {
        return Response.json({ error: parsed.error }, { status: 400 });
      }
      data.price = parsed.value;
    }

    if (body.yjCode !== undefined) {
      if (body.yjCode === null) data.yjCode = null;
      else if (typeof body.yjCode === "string")
        data.yjCode = body.yjCode.slice(0, 50);
      else
        return Response.json({ error: "invalid yjCode" }, { status: 400 });
    }
    if (body.janCode !== undefined) {
      if (body.janCode === null) data.janCode = null;
      else if (typeof body.janCode === "string")
        data.janCode = body.janCode.slice(0, 50);
      else
        return Response.json({ error: "invalid janCode" }, { status: 400 });
    }

    if (body.minStock !== undefined) {
      const parsed = parseStockLevel(body.minStock, "minStock");
      if (!parsed.ok)
        return Response.json({ error: parsed.error }, { status: 400 });
      data.minStock = parsed.value;
    }
    if (body.reorderPoint !== undefined) {
      const parsed = parseStockLevel(body.reorderPoint, "reorderPoint");
      if (!parsed.ok)
        return Response.json({ error: parsed.error }, { status: 400 });
      data.reorderPoint = parsed.value;
    }

    if (typeof body.storageTemp === "string") {
      if (!VALID_STORAGE.has(body.storageTemp)) {
        return Response.json({ error: "invalid storageTemp" }, { status: 400 });
      }
      data.storageTemp = body.storageTemp;
    }
    if (typeof body.animalType === "string") {
      if (!VALID_ANIMAL.has(body.animalType)) {
        return Response.json({ error: "invalid animalType" }, { status: 400 });
      }
      data.animalType = body.animalType;
    }
    if (typeof body.requiresPrescription === "boolean") {
      data.requiresPrescription = body.requiresPrescription;
    }
    if (body.toxicClass !== undefined) {
      if (body.toxicClass === null) data.toxicClass = null;
      else if (typeof body.toxicClass === "string")
        data.toxicClass = body.toxicClass.slice(0, 50);
    }
    if (body.imageUrl !== undefined) {
      if (body.imageUrl === null) data.imageUrl = null;
      else if (typeof body.imageUrl === "string")
        data.imageUrl = body.imageUrl.slice(0, 500);
    }
    if (body.notes !== undefined) {
      if (body.notes === null) data.notes = null;
      else if (typeof body.notes === "string")
        data.notes = body.notes.slice(0, 2000);
    }

    const item = await prisma.item.update({ where: { id }, data });
    return Response.json({ item });
  } catch (error) {
    console.error("PUT /api/items/[id] failed", error);
    return Response.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/items/[id]">,
) {
  try {
    const { id } = await ctx.params;

    // Audit trail integrity: never destroy Transaction history for items
    // that have been used. Once a controlled substance has been dispensed,
    // its full transaction log must remain.
    const txCount = await prisma.transaction.count({ where: { itemId: id } });
    if (txCount > 0) {
      return Response.json(
        {
          error:
            "取引履歴がある物品は削除できません（監査証跡保護のため）。" +
            "代わりに物品を非表示にするか、別物品として再登録してください。",
        },
        { status: 409 },
      );
    }

    // No transactions yet — safe to clean up the related rows. Keep this
    // narrow: Inventory rows for an unused item are zero-quantity placeholders;
    // OrderItem refers to the item by id, but if no transactions exist, no
    // received order has used it.
    await prisma.$transaction([
      prisma.inventory.deleteMany({ where: { itemId: id } }),
      prisma.alert.deleteMany({ where: { itemId: id } }),
      prisma.orderItem.deleteMany({ where: { itemId: id } }),
      prisma.item.delete({ where: { id } }),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/items/[id] failed", error);
    return Response.json({ error: "Failed to delete item" }, { status: 500 });
  }
}

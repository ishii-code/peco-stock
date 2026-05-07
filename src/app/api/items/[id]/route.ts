import { prisma } from "@/lib/prisma";
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
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.category === "string" && VALID_CATEGORIES.has(body.category))
      data.category = body.category;
    if (typeof body.unit === "string") data.unit = body.unit.trim();
    if (typeof body.price === "number" || body.price === null)
      data.price = body.price;
    if (typeof body.yjCode === "string" || body.yjCode === null)
      data.yjCode = body.yjCode;
    if (typeof body.janCode === "string" || body.janCode === null)
      data.janCode = body.janCode;
    if (typeof body.minStock === "number") data.minStock = body.minStock;
    if (typeof body.reorderPoint === "number")
      data.reorderPoint = body.reorderPoint;
    if (typeof body.storageTemp === "string" && VALID_STORAGE.has(body.storageTemp))
      data.storageTemp = body.storageTemp;
    if (typeof body.animalType === "string" && VALID_ANIMAL.has(body.animalType))
      data.animalType = body.animalType;
    if (typeof body.requiresPrescription === "boolean")
      data.requiresPrescription = body.requiresPrescription;
    if (typeof body.toxicClass === "string" || body.toxicClass === null)
      data.toxicClass = body.toxicClass;
    if (typeof body.imageUrl === "string" || body.imageUrl === null)
      data.imageUrl = body.imageUrl;
    if (typeof body.notes === "string" || body.notes === null)
      data.notes = body.notes;

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
    await prisma.$transaction([
      prisma.inventory.deleteMany({ where: { itemId: id } }),
      prisma.transaction.deleteMany({ where: { itemId: id } }),
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

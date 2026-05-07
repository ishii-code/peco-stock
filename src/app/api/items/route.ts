import { createId } from "@/lib/cuid";
import { listItemsWithStock } from "@/lib/items";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const items = await listItemsWithStock({
      clinicId: searchParams.get("clinicId") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return Response.json({ items });
  } catch (error) {
    console.error("GET /api/items failed", error);
    return Response.json(
      { error: "Failed to fetch items" },
      { status: 500 },
    );
  }
}

type CreateItemBody = {
  name?: unknown;
  category?: unknown;
  unit?: unknown;
  clinicId?: unknown;
  price?: unknown;
  yjCode?: unknown;
  janCode?: unknown;
  minStock?: unknown;
  reorderPoint?: unknown;
  storageTemp?: unknown;
  animalType?: unknown;
  requiresPrescription?: unknown;
  toxicClass?: unknown;
  imageUrl?: unknown;
  notes?: unknown;
};

const VALID_CATEGORIES = new Set(["medical", "consumable", "reagent"]);
const VALID_STORAGE = new Set(["normal", "refrigerated", "frozen"]);
const VALID_ANIMAL = new Set(["dog", "cat", "both"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateItemBody;

    if (typeof body.name !== "string" || body.name.trim() === "") {
      return Response.json({ error: "name is required" }, { status: 400 });
    }
    if (typeof body.category !== "string" || !VALID_CATEGORIES.has(body.category)) {
      return Response.json(
        { error: "category must be one of medical|consumable|reagent" },
        { status: 400 },
      );
    }
    if (typeof body.unit !== "string" || body.unit.trim() === "") {
      return Response.json({ error: "unit is required" }, { status: 400 });
    }
    if (typeof body.clinicId !== "string" || body.clinicId.trim() === "") {
      return Response.json({ error: "clinicId is required" }, { status: 400 });
    }

    const storageTemp =
      typeof body.storageTemp === "string" && VALID_STORAGE.has(body.storageTemp)
        ? body.storageTemp
        : "normal";
    const animalType =
      typeof body.animalType === "string" && VALID_ANIMAL.has(body.animalType)
        ? body.animalType
        : "both";

    const item = await prisma.item.create({
      data: {
        name: body.name.trim(),
        category: body.category,
        unit: body.unit.trim(),
        clinicId: body.clinicId.trim(),
        price: typeof body.price === "number" ? body.price : null,
        yjCode: typeof body.yjCode === "string" ? body.yjCode : null,
        janCode: typeof body.janCode === "string" ? body.janCode : null,
        minStock: typeof body.minStock === "number" ? body.minStock : 0,
        reorderPoint:
          typeof body.reorderPoint === "number" ? body.reorderPoint : 0,
        storageTemp,
        animalType,
        requiresPrescription: body.requiresPrescription === true,
        toxicClass:
          typeof body.toxicClass === "string" ? body.toxicClass : null,
        qrCode: createId(),
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
        notes: typeof body.notes === "string" ? body.notes : null,
      },
    });

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/items failed", error);
    return Response.json(
      { error: "Failed to create item" },
      { status: 500 },
    );
  }
}

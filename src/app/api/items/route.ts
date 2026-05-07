import { createId } from "@/lib/cuid";
import { listItemsWithStock } from "@/lib/items";
import { prisma } from "@/lib/prisma";
import {
  parsePrice,
  parseRequiredString,
  parseStockLevel,
} from "@/lib/validation";
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

    const nameParsed = parseRequiredString(body.name, "name", 200);
    if (!nameParsed.ok) {
      return Response.json({ error: nameParsed.error }, { status: 400 });
    }
    if (typeof body.category !== "string" || !VALID_CATEGORIES.has(body.category)) {
      return Response.json(
        { error: "category must be one of medical|consumable|reagent" },
        { status: 400 },
      );
    }
    const unitParsed = parseRequiredString(body.unit, "unit", 20);
    if (!unitParsed.ok) {
      return Response.json({ error: unitParsed.error }, { status: 400 });
    }
    const clinicIdParsed = parseRequiredString(body.clinicId, "clinicId", 64);
    if (!clinicIdParsed.ok) {
      return Response.json({ error: clinicIdParsed.error }, { status: 400 });
    }

    const minStockRaw = body.minStock ?? 0;
    const reorderPointRaw = body.reorderPoint ?? 0;
    const minStockParsed = parseStockLevel(minStockRaw, "minStock");
    if (!minStockParsed.ok) {
      return Response.json({ error: minStockParsed.error }, { status: 400 });
    }
    const reorderParsed = parseStockLevel(reorderPointRaw, "reorderPoint");
    if (!reorderParsed.ok) {
      return Response.json({ error: reorderParsed.error }, { status: 400 });
    }
    const priceParsed = parsePrice(body.price);
    if (!priceParsed.ok) {
      return Response.json({ error: priceParsed.error }, { status: 400 });
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
        name: nameParsed.value,
        category: body.category,
        unit: unitParsed.value,
        clinicId: clinicIdParsed.value,
        price: priceParsed.value,
        yjCode:
          typeof body.yjCode === "string" ? body.yjCode.slice(0, 50) : null,
        janCode:
          typeof body.janCode === "string" ? body.janCode.slice(0, 50) : null,
        minStock: minStockParsed.value,
        reorderPoint: reorderParsed.value,
        storageTemp,
        animalType,
        requiresPrescription: body.requiresPrescription === true,
        toxicClass:
          typeof body.toxicClass === "string"
            ? body.toxicClass.slice(0, 50)
            : null,
        qrCode: createId(),
        imageUrl:
          typeof body.imageUrl === "string"
            ? body.imageUrl.slice(0, 500)
            : null,
        notes:
          typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
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

import { prisma } from "@/lib/prisma";
import { parseRequiredString } from "@/lib/validation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId") ?? undefined;
    const stocktakes = await prisma.stocktake.findMany({
      where: clinicId ? { clinicId } : {},
      orderBy: { startedAt: "desc" },
      include: {
        _count: { select: { entries: true } },
      },
    });
    return Response.json({ stocktakes });
  } catch (error) {
    console.error("GET /api/stocktakes failed", error);
    return Response.json(
      { error: "Failed to fetch stocktakes" },
      { status: 500 },
    );
  }
}

type CreateStocktakeBody = {
  clinicId?: unknown;
  note?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateStocktakeBody;
    const clinicIdParsed = parseRequiredString(body.clinicId, "clinicId", 64);
    if (!clinicIdParsed.ok) {
      return Response.json({ error: clinicIdParsed.error }, { status: 400 });
    }
    const stocktake = await prisma.stocktake.create({
      data: {
        clinicId: clinicIdParsed.value,
        note:
          typeof body.note === "string" ? body.note.slice(0, 1000) : null,
      },
    });
    return Response.json({ stocktake }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stocktakes failed", error);
    return Response.json(
      { error: "Failed to start stocktake" },
      { status: 500 },
    );
  }
}

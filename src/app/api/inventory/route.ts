import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId") ?? undefined;
    const itemId = searchParams.get("itemId") ?? undefined;
    const sortByExpiry = searchParams.get("sortByExpiry") === "1";

    const inventory = await prisma.inventory.findMany({
      where: {
        ...(clinicId ? { clinicId } : {}),
        ...(itemId ? { itemId } : {}),
      },
      include: {
        item: {
          select: { id: true, name: true, unit: true, category: true },
        },
      },
      orderBy: sortByExpiry
        ? [{ expiryDate: "asc" }, { createdAt: "asc" }]
        : { createdAt: "desc" },
    });

    return Response.json({ inventory });
  } catch (error) {
    console.error("GET /api/inventory failed", error);
    return Response.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}

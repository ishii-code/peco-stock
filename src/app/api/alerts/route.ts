import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const unresolvedOnly = searchParams.get("unresolved") === "1";
    const countOnly = searchParams.get("count") === "1";

    const where = {
      ...(clinicId ? { clinicId } : {}),
      ...(type ? { type } : {}),
      ...(unresolvedOnly ? { resolvedAt: null } : {}),
    };

    if (countOnly) {
      const count = await prisma.alert.count({ where });
      return Response.json({ count });
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { triggeredAt: "desc" },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            unit: true,
            category: true,
            reorderPoint: true,
          },
        },
      },
    });

    const itemIds = Array.from(new Set(alerts.map((a) => a.itemId)));
    const inventoryRows = await prisma.inventory.findMany({
      where: { itemId: { in: itemIds } },
      select: { itemId: true, quantity: true, expiryDate: true, lotNumber: true },
    });
    const stockByItem = new Map<string, number>();
    const nearestExpiryByItem = new Map<string, Date | null>();
    for (const row of inventoryRows) {
      stockByItem.set(
        row.itemId,
        (stockByItem.get(row.itemId) ?? 0) + row.quantity,
      );
      const current = nearestExpiryByItem.get(row.itemId) ?? null;
      if (row.expiryDate && (!current || row.expiryDate < current)) {
        nearestExpiryByItem.set(row.itemId, row.expiryDate);
      }
    }

    const enriched = alerts.map((alert) => ({
      ...alert,
      currentStock: stockByItem.get(alert.itemId) ?? 0,
      nearestExpiry: nearestExpiryByItem.get(alert.itemId) ?? null,
    }));

    return Response.json({ alerts: enriched });
  } catch (error) {
    console.error("GET /api/alerts failed", error);
    return Response.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

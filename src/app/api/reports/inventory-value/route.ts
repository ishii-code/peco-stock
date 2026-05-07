import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId") ?? undefined;

    const items = await prisma.item.findMany({
      where: clinicId ? { clinicId } : {},
      include: { inventory: { select: { quantity: true } } },
    });

    const totalsByCategory = new Map<
      string,
      { quantity: number; value: number; itemCount: number }
    >();
    for (const item of items) {
      const totalQty = item.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      );
      const value = (item.price ?? 0) * totalQty;
      const current = totalsByCategory.get(item.category) ?? {
        quantity: 0,
        value: 0,
        itemCount: 0,
      };
      current.quantity += totalQty;
      current.value += value;
      current.itemCount += 1;
      totalsByCategory.set(item.category, current);
    }

    const breakdown = Array.from(totalsByCategory.entries()).map(
      ([category, totals]) => ({ category, ...totals }),
    );
    const total = breakdown.reduce((sum, b) => sum + b.value, 0);

    return Response.json({ breakdown, total });
  } catch (error) {
    console.error("GET /api/reports/inventory-value failed", error);
    return Response.json(
      { error: "Failed to compute inventory value" },
      { status: 500 },
    );
  }
}

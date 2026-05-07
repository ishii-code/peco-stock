import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId") ?? undefined;
    const periodDays = Number(searchParams.get("periodDays") ?? "90");
    const period = Number.isFinite(periodDays) && periodDays > 0 ? periodDays : 90;
    const since = new Date(Date.now() - period * DAY_MS);

    const items = await prisma.item.findMany({
      where: clinicId ? { clinicId } : {},
      include: {
        inventory: { select: { quantity: true } },
        transactions: {
          where: { type: "out", createdAt: { gte: since } },
          select: { quantity: true },
        },
      },
    });

    const ranking = items
      .map((item) => {
        const stock = item.inventory.reduce((s, inv) => s + inv.quantity, 0);
        const consumed = item.transactions.reduce((s, tx) => s + tx.quantity, 0);
        const avgStock = stock > 0 ? stock : 1;
        const turnover = consumed / avgStock;
        return {
          itemId: item.id,
          name: item.name,
          unit: item.unit,
          category: item.category,
          consumed,
          stock,
          turnover: Number(turnover.toFixed(3)),
        };
      })
      .sort((a, b) => b.turnover - a.turnover)
      .slice(0, 10);

    return Response.json({ ranking, periodDays: period });
  } catch (error) {
    console.error("GET /api/reports/turnover failed", error);
    return Response.json(
      { error: "Failed to compute turnover" },
      { status: 500 },
    );
  }
}

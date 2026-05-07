import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId") ?? undefined;
    const itemId = searchParams.get("itemId") ?? undefined;
    const startRaw = searchParams.get("startDate");
    const endRaw = searchParams.get("endDate");
    const startDate = startRaw ? new Date(startRaw) : null;
    const endDate = endRaw ? new Date(endRaw) : null;

    const transactions = await prisma.transaction.findMany({
      where: {
        type: "out",
        ...(clinicId ? { clinicId } : {}),
        ...(itemId ? { itemId } : {}),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      select: { itemId: true, quantity: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const byDate = new Map<string, number>();
    for (const tx of transactions) {
      const key = tx.createdAt.toISOString().slice(0, 10);
      byDate.set(key, (byDate.get(key) ?? 0) + tx.quantity);
    }

    const series = Array.from(byDate.entries()).map(([date, quantity]) => ({
      date,
      quantity,
    }));

    return Response.json({ series });
  } catch (error) {
    console.error("GET /api/reports/consumption failed", error);
    return Response.json(
      { error: "Failed to compute consumption" },
      { status: 500 },
    );
  }
}

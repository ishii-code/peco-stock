import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get("clinicId") ?? undefined;

    const cutoff90 = new Date(Date.now() + 90 * DAY_MS);

    const inventory = await prisma.inventory.findMany({
      where: {
        ...(clinicId ? { clinicId } : {}),
        expiryDate: { lte: cutoff90 },
        quantity: { gt: 0 },
      },
      include: { item: { select: { id: true, name: true, unit: true, category: true } } },
      orderBy: { expiryDate: "asc" },
    });

    const now = Date.now();
    const buckets: Record<"d30" | "d60" | "d90", typeof inventory> = {
      d30: [],
      d60: [],
      d90: [],
    };
    const enriched = inventory.map((inv) => {
      const expiry = inv.expiryDate as Date;
      const days = Math.ceil((expiry.getTime() - now) / DAY_MS);
      return { ...inv, daysLeft: days };
    });
    for (const inv of enriched) {
      if (inv.daysLeft <= 30) buckets.d30.push(inv);
      else if (inv.daysLeft <= 60) buckets.d60.push(inv);
      else if (inv.daysLeft <= 90) buckets.d90.push(inv);
    }

    return Response.json({
      d30: buckets.d30,
      d60: buckets.d60,
      d90: buckets.d90,
    });
  } catch (error) {
    console.error("GET /api/reports/expiry failed", error);
    return Response.json(
      { error: "Failed to compute expiry report" },
      { status: 500 },
    );
  }
}

import { prisma } from "@/lib/prisma";
import { sendExpiryAlert, sendReorderAlert } from "@/lib/slack";
import type { NextRequest } from "next/server";

const EXPIRY_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type CheckBody = {
  clinicId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckBody;
    const clinicId =
      typeof body.clinicId === "string" && body.clinicId.trim() !== ""
        ? body.clinicId
        : undefined;

    const items = await prisma.item.findMany({
      where: clinicId ? { clinicId } : {},
      include: {
        inventory: {
          select: { quantity: true, expiryDate: true, lotNumber: true },
        },
        alerts: {
          where: { resolvedAt: null },
          select: { id: true, type: true },
        },
      },
    });

    const created: { reorder: number; expiry: number } = {
      reorder: 0,
      expiry: 0,
    };
    const now = new Date();
    const cutoff = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * DAY_MS);

    for (const item of items) {
      const totalStock = item.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      );
      const hasReorderAlert = item.alerts.some((a) => a.type === "reorder");

      if (
        item.reorderPoint > 0 &&
        totalStock <= item.reorderPoint &&
        !hasReorderAlert
      ) {
        await prisma.alert.create({
          data: {
            itemId: item.id,
            clinicId: item.clinicId,
            type: "reorder",
          },
        });
        created.reorder += 1;
        await sendReorderAlert(
          {
            id: item.id,
            name: item.name,
            unit: item.unit,
            category: item.category,
          },
          totalStock,
          item.reorderPoint,
        );
      }

      const hasExpiryAlert = item.alerts.some((a) => a.type === "expiry");
      const upcomingExpiry = item.inventory
        .map((inv) => inv.expiryDate)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime())[0];

      if (
        upcomingExpiry &&
        upcomingExpiry <= cutoff &&
        upcomingExpiry >= now &&
        !hasExpiryAlert
      ) {
        await prisma.alert.create({
          data: {
            itemId: item.id,
            clinicId: item.clinicId,
            type: "expiry",
          },
        });
        created.expiry += 1;
        const daysLeft = Math.ceil(
          (upcomingExpiry.getTime() - now.getTime()) / DAY_MS,
        );
        await sendExpiryAlert(
          {
            id: item.id,
            name: item.name,
            unit: item.unit,
            category: item.category,
          },
          upcomingExpiry,
          daysLeft,
        );
      }
    }

    return Response.json({ created });
  } catch (error) {
    console.error("POST /api/alerts/check failed", error);
    return Response.json(
      { error: "Failed to run alert check" },
      { status: 500 },
    );
  }
}

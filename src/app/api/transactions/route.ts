import { prisma } from "@/lib/prisma";
import {
  parseDateOrNull,
  parseQuantity,
  parseRequiredString,
} from "@/lib/validation";
import type { NextRequest } from "next/server";

const VALID_TYPES = new Set(["in", "out", "move", "discard", "adjust"]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const transactions = await prisma.transaction.findMany({
      where: {
        ...(searchParams.get("itemId")
          ? { itemId: searchParams.get("itemId")! }
          : {}),
        ...(searchParams.get("clinicId")
          ? { clinicId: searchParams.get("clinicId")! }
          : {}),
        ...(searchParams.get("type")
          ? { type: searchParams.get("type")! }
          : {}),
      },
      include: {
        item: { select: { id: true, name: true, unit: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return Response.json({ transactions });
  } catch (error) {
    console.error("GET /api/transactions failed", error);
    return Response.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}

type CreateTransactionBody = {
  itemId?: unknown;
  clinicId?: unknown;
  type?: unknown;
  quantity?: unknown;
  lotNumber?: unknown;
  expiryDate?: unknown;
  location?: unknown;
  patientId?: unknown;
  vetId?: unknown;
  note?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateTransactionBody;

    const itemIdParsed = parseRequiredString(body.itemId, "itemId", 64);
    if (!itemIdParsed.ok) {
      return Response.json({ error: itemIdParsed.error }, { status: 400 });
    }
    const clinicIdParsed = parseRequiredString(body.clinicId, "clinicId", 64);
    if (!clinicIdParsed.ok) {
      return Response.json({ error: clinicIdParsed.error }, { status: 400 });
    }
    if (typeof body.type !== "string" || !VALID_TYPES.has(body.type)) {
      return Response.json(
        { error: "type must be one of in|out|move|discard|adjust" },
        { status: 400 },
      );
    }
    // adjust may set quantity = 0 (full depletion); other types must be > 0
    const isAdjust = body.type === "adjust";
    const qtyParsed = parseQuantity(body.quantity, "quantity", {
      positive: !isAdjust,
    });
    if (!qtyParsed.ok) {
      return Response.json({ error: qtyParsed.error }, { status: 400 });
    }
    const expiryParsed = parseDateOrNull(body.expiryDate, "expiryDate");
    if (!expiryParsed.ok) {
      return Response.json({ error: expiryParsed.error }, { status: 400 });
    }

    const itemId = itemIdParsed.value;
    const clinicId = clinicIdParsed.value;
    const type = body.type;
    const quantity = qtyParsed.value;
    const lotNumber =
      typeof body.lotNumber === "string" && body.lotNumber.trim() !== ""
        ? body.lotNumber.trim().slice(0, 100)
        : null;
    const expiryDate = expiryParsed.value;
    const location =
      typeof body.location === "string" ? body.location.slice(0, 200) : null;
    const note =
      typeof body.note === "string" ? body.note.slice(0, 1000) : null;
    const patientId =
      typeof body.patientId === "string"
        ? body.patientId.slice(0, 64)
        : null;
    const vetId =
      typeof body.vetId === "string" ? body.vetId.slice(0, 64) : null;

    // For out/discard, refuse if requested quantity exceeds available stock.
    // This both prevents Transaction-vs-Inventory audit-trail mismatch and
    // makes negative-quantity exploits impossible (already rejected above).
    if (type === "out" || type === "discard") {
      const lots = await prisma.inventory.findMany({
        where: {
          itemId,
          clinicId,
          ...(lotNumber ? { lotNumber } : {}),
          quantity: { gt: 0 },
        },
        select: { quantity: true },
      });
      const available = lots.reduce((sum, l) => sum + l.quantity, 0);
      if (available < quantity) {
        return Response.json(
          {
            error: `Insufficient stock (have ${available}, want ${quantity})`,
          },
          { status: 409 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          itemId,
          clinicId,
          type,
          quantity,
          lotNumber,
          patientId,
          vetId,
          note,
        },
      });

      if (type === "in") {
        const existing = lotNumber
          ? await tx.inventory.findFirst({
              where: { itemId, clinicId, lotNumber },
            })
          : await tx.inventory.findFirst({
              where: { itemId, clinicId, lotNumber: null },
            });
        if (existing) {
          await tx.inventory.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + quantity },
          });
        } else {
          await tx.inventory.create({
            data: {
              itemId,
              clinicId,
              quantity,
              lotNumber,
              expiryDate,
              location,
            },
          });
        }
      } else if (type === "out" || type === "discard") {
        let remaining = quantity;
        const lots = await tx.inventory.findMany({
          where: {
            itemId,
            clinicId,
            ...(lotNumber ? { lotNumber } : {}),
            quantity: { gt: 0 },
          },
          orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
        });
        for (const lot of lots) {
          if (remaining <= 0) break;
          const used = Math.min(lot.quantity, remaining);
          await tx.inventory.update({
            where: { id: lot.id },
            data: { quantity: lot.quantity - used },
          });
          remaining -= used;
        }
      } else if (type === "adjust") {
        const lot = lotNumber
          ? await tx.inventory.findFirst({
              where: { itemId, clinicId, lotNumber },
            })
          : await tx.inventory.findFirst({
              where: { itemId, clinicId, lotNumber: null },
            });
        if (lot) {
          await tx.inventory.update({
            where: { id: lot.id },
            data: { quantity },
          });
        } else {
          await tx.inventory.create({
            data: {
              itemId,
              clinicId,
              quantity,
              lotNumber,
              expiryDate,
              location,
            },
          });
        }
      }

      return transaction;
    });

    return Response.json({ transaction: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions failed", error);
    return Response.json(
      { error: "Failed to record transaction" },
      { status: 500 },
    );
  }
}

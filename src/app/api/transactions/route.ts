import { prisma } from "@/lib/prisma";
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

    if (typeof body.itemId !== "string" || body.itemId.trim() === "") {
      return Response.json({ error: "itemId is required" }, { status: 400 });
    }
    if (typeof body.clinicId !== "string" || body.clinicId.trim() === "") {
      return Response.json({ error: "clinicId is required" }, { status: 400 });
    }
    if (typeof body.type !== "string" || !VALID_TYPES.has(body.type)) {
      return Response.json(
        { error: "type must be one of in|out|move|discard|adjust" },
        { status: 400 },
      );
    }
    if (typeof body.quantity !== "number" || Number.isNaN(body.quantity)) {
      return Response.json(
        { error: "quantity must be a number" },
        { status: 400 },
      );
    }

    const itemId = body.itemId;
    const clinicId = body.clinicId;
    const type = body.type;
    const quantity = body.quantity;
    const lotNumber =
      typeof body.lotNumber === "string" && body.lotNumber.trim() !== ""
        ? body.lotNumber
        : null;
    const expiryDate =
      typeof body.expiryDate === "string" && body.expiryDate !== ""
        ? new Date(body.expiryDate)
        : null;
    const location =
      typeof body.location === "string" ? body.location : null;
    const note = typeof body.note === "string" ? body.note : null;
    const patientId =
      typeof body.patientId === "string" ? body.patientId : null;
    const vetId = typeof body.vetId === "string" ? body.vetId : null;

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

import { prisma } from "@/lib/prisma";

const BOM = "﻿";

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return BOM + lines.join("\r\n");
}

export async function exportInventoryCSV(clinicId: string): Promise<string> {
  const items = await prisma.item.findMany({
    where: { clinicId },
    include: { inventory: true },
    orderBy: { name: "asc" },
  });

  const headers = [
    "物品ID",
    "物品名",
    "カテゴリ",
    "単位",
    "薬価",
    "発注点",
    "最小在庫",
    "保管温度",
    "適応動物",
    "在庫合計",
    "ロット数",
    "最短期限",
  ];
  const rows = items.map((item) => {
    const totalQty = item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    const expiries = item.inventory
      .map((inv) => inv.expiryDate)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    return [
      item.id,
      item.name,
      item.category,
      item.unit,
      item.price ?? "",
      item.reorderPoint,
      item.minStock,
      item.storageTemp,
      item.animalType,
      totalQty,
      item.inventory.length,
      expiries[0] ? expiries[0].toISOString().slice(0, 10) : "",
    ];
  });
  return toCsv(headers, rows);
}

export async function exportTransactionCSV(
  clinicId: string,
  startDate: Date | null,
  endDate: Date | null,
): Promise<string> {
  const transactions = await prisma.transaction.findMany({
    where: {
      clinicId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    include: { item: { select: { name: true, unit: true, category: true } } },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "日時",
    "種別",
    "物品ID",
    "物品名",
    "カテゴリ",
    "数量",
    "単位",
    "ロット",
    "患者ID",
    "獣医師ID",
    "メモ",
  ];
  const rows = transactions.map((tx) => [
    tx.createdAt,
    tx.type,
    tx.itemId,
    tx.item.name,
    tx.item.category,
    tx.quantity,
    tx.item.unit,
    tx.lotNumber ?? "",
    tx.patientId ?? "",
    tx.vetId ?? "",
    tx.note ?? "",
  ]);
  return toCsv(headers, rows);
}

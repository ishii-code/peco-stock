"use client";

import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { CenteredSpinner } from "@/components/Spinner";
import { Toast } from "@/components/Toast";
import { CATEGORY_LABEL } from "@/constants";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import type {
  ConsumptionPoint,
  ExpiryReport,
  ExpiryRow,
  InventoryValueReport,
  Item,
  TurnoverRow,
} from "@/types";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CATEGORY_COLOR: Record<string, string> = {
  medical: "#00b5ad",
  consumable: "#f59e0b",
  reagent: "#7c3aed",
};

function defaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

type ItemRef = Pick<Item, "id" | "name" | "unit">;

export default function ReportsPage() {
  const { clinicId } = useClinic();
  const { toast, showInfo, dismiss } = useToast();
  const [items, setItems] = useState<ItemRef[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const initial = defaultDateRange();
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [consumption, setConsumption] = useState<ConsumptionPoint[] | null>(null);
  const [inventoryValue, setInventoryValue] = useState<InventoryValueReport | null>(null);
  const [expiry, setExpiry] = useState<ExpiryReport | null>(null);
  const [turnover, setTurnover] = useState<TurnoverRow[] | null>(null);

  useEffect(() => {
    api
      .listItems({ clinicId })
      .then((data) => {
        setItems(data.items);
        if (data.items[0]) {
          setSelectedItemId((curr) => curr || data.items[0].id);
        }
      })
      .catch(() => {});
  }, [clinicId]);

  useEffect(() => {
    if (!selectedItemId) return;
    api
      .reportConsumption({
        clinicId,
        itemId: selectedItemId,
        startDate,
        endDate,
      })
      .then((data) => setConsumption(data.series))
      .catch(() => setConsumption([]));
  }, [clinicId, selectedItemId, startDate, endDate]);

  useEffect(() => {
    api
      .reportInventoryValue({ clinicId })
      .then(setInventoryValue)
      .catch(() => setInventoryValue({ breakdown: [], total: 0 }));
    api
      .reportExpiry({ clinicId })
      .then(setExpiry)
      .catch(() => setExpiry({ d30: [], d60: [], d90: [] }));
    api
      .reportTurnover({ clinicId })
      .then((data) => setTurnover(data.ranking))
      .catch(() => setTurnover([]));
  }, [clinicId]);

  function exportCsv(kind: "inventory" | "transactions") {
    const url =
      kind === "inventory"
        ? api.exportInventoryUrl({ clinicId })
        : api.exportTransactionsUrl({ clinicId, startDate, endDate });
    window.open(url, "_blank");
    showInfo("CSVをダウンロード中...");
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="レポート" showAlertBadge />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 space-y-8">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportCsv("inventory")}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#00b5ad] bg-white px-4 text-sm font-medium text-[#00b5ad] hover:bg-[#e6f7f6] active:scale-95"
          >
            在庫CSV出力
          </button>
          <button
            type="button"
            onClick={() => exportCsv("transactions")}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#00b5ad] bg-white px-4 text-sm font-medium text-[#00b5ad] hover:bg-[#e6f7f6] active:scale-95"
          >
            入出庫CSV出力（期間）
          </button>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 mr-auto">
              消費トレンド
            </h2>
            <label className="block">
              <span className="block text-xs text-zinc-500 mb-1">物品</span>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="h-12 rounded-xl border border-zinc-200 bg-white px-3 text-base"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs text-zinc-500 mb-1">開始</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12 rounded-xl border border-zinc-200 bg-white px-3 text-base"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-zinc-500 mb-1">終了</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-12 rounded-xl border border-zinc-200 bg-white px-3 text-base"
              />
            </label>
          </div>
          <div className="h-64">
            {consumption === null ? (
              <CenteredSpinner />
            ) : consumption.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                該当期間の出庫データがありません
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={consumption}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke="#00b5ad"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">
              カテゴリ別在庫金額
            </h2>
            {inventoryValue && (
              <div className="text-sm text-zinc-500">
                合計 ¥{inventoryValue.total.toLocaleString()}
              </div>
            )}
          </div>
          <div className="h-64">
            {inventoryValue === null ? (
              <CenteredSpinner />
            ) : inventoryValue.total === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                薬価が設定された在庫がありません
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryValue.breakdown}
                    dataKey="value"
                    nameKey="category"
                    outerRadius={90}
                    label={(entry: { name?: string; value?: number }) => {
                      const name = entry.name ?? "";
                      const value = entry.value ?? 0;
                      return `${CATEGORY_LABEL[name] ?? name}: ¥${value.toLocaleString()}`;
                    }}
                  >
                    {inventoryValue.breakdown.map((b) => (
                      <Cell
                        key={b.category}
                        fill={CATEGORY_COLOR[b.category] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      `¥${Number(value ?? 0).toLocaleString()}`
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">
            期限切れ予定
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ExpiryBucket
              title="30日以内"
              tone="danger"
              rows={expiry?.d30 ?? null}
            />
            <ExpiryBucket
              title="60日以内"
              tone="warning"
              rows={expiry?.d60 ?? null}
            />
            <ExpiryBucket
              title="90日以内"
              tone="muted"
              rows={expiry?.d90 ?? null}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">
            在庫回転率ランキング（直近90日）
          </h2>
          {turnover === null ? (
            <CenteredSpinner />
          ) : turnover.length === 0 ? (
            <EmptyState message="データがありません" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">順位</th>
                    <th className="px-4 py-3 text-left font-medium">物品</th>
                    <th className="px-4 py-3 text-right font-medium">消費量</th>
                    <th className="px-4 py-3 text-right font-medium">現在庫</th>
                    <th className="px-4 py-3 text-right font-medium">回転率</th>
                  </tr>
                </thead>
                <tbody>
                  {turnover.map((row, i) => (
                    <tr key={row.itemId} className="border-t border-zinc-100">
                      <td className="px-4 py-3 tabular-nums text-zinc-500">
                        #{i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {row.name}
                        <div className="text-xs text-zinc-500">
                          {CATEGORY_LABEL[row.category] ?? row.category}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.consumed} {row.unit}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.stock} {row.unit}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#00b5ad]">
                        {row.turnover}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      {toast && (
        <Toast tone={toast.tone} message={toast.message} onDismiss={dismiss} />
      )}
    </div>
  );
}

function ExpiryBucket({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "danger" | "warning" | "muted";
  rows: ExpiryRow[] | null;
}) {
  const headerStyle =
    tone === "danger"
      ? "bg-red-50 text-red-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-800"
        : "bg-zinc-50 text-zinc-700";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <div className={`px-4 py-3 text-sm font-semibold ${headerStyle}`}>
        {title}{" "}
        <span className="text-xs font-normal">
          ({rows ? rows.length : "—"}件)
        </span>
      </div>
      <ul className="divide-y divide-zinc-100">
        {rows === null ? (
          <li className="px-4 py-3 text-sm text-zinc-500">読み込み中...</li>
        ) : rows.length === 0 ? (
          <li className="px-4 py-3 text-sm text-zinc-500">該当なし</li>
        ) : (
          rows.slice(0, 6).map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm">
              <div className="font-medium text-zinc-900">{row.item.name}</div>
              <div className="text-xs text-zinc-500 flex justify-between mt-1 tabular-nums">
                <span>
                  期限:{" "}
                  {row.expiryDate
                    ? new Date(row.expiryDate).toLocaleDateString("ja-JP")
                    : "—"}
                </span>
                <span>
                  残{row.daysLeft}日 · {row.quantity}
                  {row.item.unit}
                </span>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

"use client";

import { Header } from "@/components/Header";
import { Toast } from "@/components/Toast";
import { DEFAULT_CLINIC_ID } from "@/lib/clinic";
import { useEffect, useState } from "react";

type ItemRow = {
  id: string;
  name: string;
  unit: string;
  category: string;
  totalQuantity: number;
};

type CompletedEntry = {
  id: string;
  itemId: string;
  expected: number;
  actual: number;
  diff: number;
  item: { id: string; name: string; unit: string; category: string } | null;
};

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

const CATEGORY_LABEL: Record<string, string> = {
  medical: "医薬品",
  consumable: "消耗品",
  reagent: "試薬",
};

export default function StocktakePage() {
  const [stocktakeId, setStocktakeId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[] | null>(null);
  const [actuals, setActuals] = useState<Record<string, string>>({});
  const [report, setReport] = useState<CompletedEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!stocktakeId || report) return;
    let cancelled = false;
    const url = new URL("/api/items", window.location.origin);
    url.searchParams.set("clinicId", DEFAULT_CLINIC_ID);
    fetch(url.toString(), { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: ItemRow[] }) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setError("物品リストの取得に失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [stocktakeId, report]);

  async function startStocktake() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stocktakes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicId: DEFAULT_CLINIC_ID }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { stocktake: { id: string } };
      setStocktakeId(data.stocktake.id);
      setActuals({});
      setReport(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "棚卸開始に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function completeStocktake() {
    if (!stocktakeId || !items) return;
    setBusy(true);
    setError(null);
    try {
      const entries = items
        .map((item) => {
          const raw = actuals[item.id];
          if (raw === undefined || raw.trim() === "") return null;
          const actual = Number(raw);
          if (!Number.isFinite(actual)) return null;
          return { itemId: item.id, actual };
        })
        .filter((x): x is { itemId: string; actual: number } => x !== null);

      if (entries.length === 0) {
        throw new Error("実数を1件以上入力してください");
      }

      const res = await fetch(`/api/stocktakes/${stocktakeId}/complete`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        stocktake: { entries: CompletedEntry[] };
      };
      setReport(data.stocktake.entries);
      setToast({ tone: "success", message: "棚卸を完了しました" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "棚卸完了に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStocktakeId(null);
    setItems(null);
    setActuals({});
    setReport(null);
    setError(null);
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="棚卸" showAlertBadge />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!stocktakeId && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-zinc-900">
              新しい棚卸を開始
            </h2>
            <p className="text-sm text-zinc-500 mt-2">
              現在のシステム在庫を凍結して、実在庫との差異を記録します。
            </p>
            <button
              type="button"
              onClick={startStocktake}
              disabled={busy}
              className="mt-6 inline-flex h-14 items-center justify-center rounded-xl bg-[#00b5ad] px-8 text-base font-semibold text-white hover:bg-[#008f88] active:scale-[0.99] disabled:bg-zinc-300"
            >
              {busy ? "開始中..." : "新規棚卸開始"}
            </button>
          </div>
        )}

        {stocktakeId && !report && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#00b5ad] bg-[#e6f7f6] px-4 py-3 text-sm text-[#008f88]">
              棚卸ID: <code className="font-mono">{stocktakeId}</code> · 各物品の実数を入力してください。
            </div>

            {items === null ? (
              <div className="flex items-center justify-center py-20 text-zinc-500">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#00b5ad] border-t-transparent" />
                <span className="ml-3">読み込み中...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center text-zinc-500">
                物品が登録されていません
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50 text-zinc-600">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">物品名</th>
                        <th className="px-4 py-3 text-right font-medium">
                          システム在庫
                        </th>
                        <th className="px-4 py-3 text-right font-medium">実数</th>
                        <th className="px-4 py-3 text-right font-medium">差異</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => {
                        const raw = actuals[row.id] ?? "";
                        const actualNum = raw === "" ? null : Number(raw);
                        const validActual =
                          actualNum !== null && Number.isFinite(actualNum);
                        const diff = validActual
                          ? actualNum - row.totalQuantity
                          : null;
                        const diffBg =
                          diff === null
                            ? ""
                            : diff === 0
                              ? "bg-emerald-50"
                              : "bg-red-50";
                        return (
                          <tr
                            key={row.id}
                            className={`border-t border-zinc-100 ${diffBg}`}
                          >
                            <td className="px-4 py-3 font-medium text-zinc-900">
                              {row.name}
                              <div className="text-xs text-zinc-500">
                                {CATEGORY_LABEL[row.category] ?? row.category} · 単位
                                {row.unit}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                              {row.totalQuantity}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={raw}
                                onChange={(e) =>
                                  setActuals((prev) => ({
                                    ...prev,
                                    [row.id]: e.target.value,
                                  }))
                                }
                                className="h-12 w-28 rounded-xl border border-zinc-200 bg-white px-3 text-right text-base tabular-nums focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
                              />
                            </td>
                            <td
                              className={`px-4 py-3 text-right tabular-nums font-semibold ${
                                diff === null
                                  ? "text-zinc-400"
                                  : diff === 0
                                    ? "text-emerald-700"
                                    : "text-red-700"
                              }`}
                            >
                              {diff === null
                                ? "—"
                                : diff > 0
                                  ? `+${diff}`
                                  : `${diff}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={completeStocktake}
              disabled={busy}
              className="h-14 w-full rounded-xl bg-[#00b5ad] text-base font-semibold text-white hover:bg-[#008f88] active:scale-[0.99] disabled:bg-zinc-300"
            >
              {busy ? "登録中..." : "棚卸完了"}
            </button>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              棚卸が完了しました。差異レポートを表示しています。
            </div>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">物品名</th>
                      <th className="px-4 py-3 text-right font-medium">
                        システム
                      </th>
                      <th className="px-4 py-3 text-right font-medium">実数</th>
                      <th className="px-4 py-3 text-right font-medium">差異</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((entry) => {
                      const diffBg =
                        entry.diff === 0 ? "bg-emerald-50" : "bg-red-50";
                      return (
                        <tr
                          key={entry.id}
                          className={`border-t border-zinc-100 ${diffBg}`}
                        >
                          <td className="px-4 py-3 font-medium text-zinc-900">
                            {entry.item?.name ?? entry.itemId}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {entry.expected}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {entry.actual}
                          </td>
                          <td
                            className={`px-4 py-3 text-right tabular-nums font-semibold ${
                              entry.diff === 0
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {entry.diff > 0
                              ? `+${entry.diff}`
                              : `${entry.diff}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="button"
              onClick={reset}
              className="h-14 w-full rounded-xl border border-[#00b5ad] bg-white text-base font-semibold text-[#00b5ad] hover:bg-[#e6f7f6] active:scale-[0.99]"
            >
              新しい棚卸を開始
            </button>
          </div>
        )}
      </main>
      {toast && (
        <Toast
          tone={toast.tone}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

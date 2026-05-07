"use client";

import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Header } from "@/components/Header";
import { CenteredSpinner } from "@/components/Spinner";
import { Toast } from "@/components/Toast";
import { CATEGORY_LABEL } from "@/constants";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import type { ItemWithStock, StocktakeEntry } from "@/types";
import { useEffect, useState } from "react";

export default function StocktakePage() {
  const { clinicId } = useClinic();
  const { toast, showSuccess, dismiss } = useToast();
  const [stocktakeId, setStocktakeId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemWithStock[] | null>(null);
  const [actuals, setActuals] = useState<Record<string, string>>({});
  const [report, setReport] = useState<StocktakeEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stocktakeId || report) return;
    let cancelled = false;
    api
      .listItems({ clinicId })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "物品リストの取得に失敗しました",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stocktakeId, report, clinicId]);

  async function startStocktake() {
    setBusy(true);
    setError(null);
    try {
      const data = await api.startStocktake({ clinicId });
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
        .map((it) => {
          const raw = actuals[it.id];
          if (raw === undefined || raw.trim() === "") return null;
          const actual = Number(raw);
          if (!Number.isFinite(actual)) return null;
          return { itemId: it.id, actual };
        })
        .filter((x): x is { itemId: string; actual: number } => x !== null);

      if (entries.length === 0) {
        throw new Error("実数を1件以上入力してください");
      }

      const data = await api.completeStocktake(stocktakeId, { entries });
      setReport(data.stocktake.entries);
      showSuccess("棚卸を完了しました");
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
        {error && <ErrorBanner message={error} className="mb-4" />}

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
              <CenteredSpinner />
            ) : items.length === 0 ? (
              <EmptyState message="物品が登録されていません" />
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
        <Toast tone={toast.tone} message={toast.message} onDismiss={dismiss} />
      )}
    </div>
  );
}

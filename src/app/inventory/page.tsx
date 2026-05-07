"use client";

import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { QrScanner } from "@/components/QrScanner";
import { CenteredSpinner } from "@/components/Spinner";
import { Toast } from "@/components/Toast";
import { CATEGORY_LABEL, DAY_MS } from "@/constants";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import type { ItemWithStock } from "@/types";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SortKey = "default" | "lowStock" | "expiry";

const CATEGORY_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "すべて" },
  { value: "medical", label: "医薬品" },
  { value: "consumable", label: "消耗品" },
  { value: "reagent", label: "試薬" },
];

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / DAY_MS);
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function InventoryPage() {
  const { clinicId } = useClinic();
  const { toast, showSuccess, showError, dismiss } = useToast();
  const [items, setItems] = useState<ItemWithStock[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement | null>>(new Map());

  const setRowRef = useCallback(
    (id: string) => (el: HTMLTableRowElement | null) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .listItems({ clinicId, category: category || undefined, search: search || undefined })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "読み込みに失敗しました");
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clinicId, category, search]);

  const sorted = useMemo(() => {
    if (!items) return null;
    if (sortKey === "default") return items;
    const copy = [...items];
    if (sortKey === "lowStock") {
      copy.sort(
        (a, b) =>
          a.totalQuantity - a.reorderPoint - (b.totalQuantity - b.reorderPoint),
      );
    } else if (sortKey === "expiry") {
      copy.sort((a, b) => {
        const ta = a.nearestExpiry
          ? new Date(a.nearestExpiry).getTime()
          : Number.POSITIVE_INFINITY;
        const tb = b.nearestExpiry
          ? new Date(b.nearestExpiry).getTime()
          : Number.POSITIVE_INFINITY;
        return ta - tb;
      });
    }
    return copy;
  }, [items, sortKey]);

  async function handleScanned(scannedId: string) {
    setScannerOpen(false);
    try {
      const data = await api.getItem(scannedId);
      setCategory("");
      setSearch("");
      setHighlightedId(data.item.id);
      showSuccess(`${data.item.name} をハイライトしました`);
      requestAnimationFrame(() => {
        const row = rowRefs.current.get(data.item.id);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      setTimeout(
        () => setHighlightedId((curr) => (curr === data.item.id ? null : curr)),
        4000,
      );
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "QRコードに対応する物品が見つかりません",
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[--background]">
      <header className="bg-white border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 min-h-[48px]">
            <span
              aria-hidden
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#00b5ad] text-white text-lg font-bold"
            >
              P
            </span>
            <span className="text-lg font-bold text-[#00b5ad]">PecoStock</span>
          </Link>
          <h1 className="text-base sm:text-lg font-semibold text-zinc-900">
            在庫一覧
          </h1>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6">
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            type="search"
            placeholder="物品名・YJ・JANで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#00b5ad] bg-white px-4 text-sm font-medium text-[#00b5ad] hover:bg-[#e6f7f6] active:scale-95"
            aria-label="QRスキャン"
          >
            <span aria-hidden className="text-xl">⊞</span>
            <span>QRスキャン</span>
          </button>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
          >
            {CATEGORY_FILTERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
          >
            <option value="default">標準順</option>
            <option value="lowStock">在庫少ない順</option>
            <option value="expiry">期限近い順</option>
          </select>
        </section>

        {error && (
          <ErrorBanner message={`読み込みエラー: ${error}`} className="mb-4" />
        )}

        {sorted === null ? (
          <CenteredSpinner />
        ) : sorted.length === 0 ? (
          <EmptyState message="該当する物品がありません" className="py-16" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">物品名</th>
                    <th className="px-4 py-3 text-left font-medium">区分</th>
                    <th className="px-4 py-3 text-right font-medium">在庫数</th>
                    <th className="px-4 py-3 text-right font-medium">発注点</th>
                    <th className="px-4 py-3 text-left font-medium">有効期限</th>
                    <th className="px-4 py-3 text-left font-medium">状態</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <ItemRowView
                      key={row.id}
                      row={row}
                      isHighlighted={row.id === highlightedId}
                      setRef={setRowRef(row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      {scannerOpen && (
        <QrScanner
          onScan={handleScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}
      {toast && (
        <Toast tone={toast.tone} message={toast.message} onDismiss={dismiss} />
      )}
    </div>
  );
}

// Pulled into its own component so React can skip re-rendering rows whose
// props haven't changed when the parent re-renders (e.g., search typing).
const ItemRowView = function ItemRowView({
  row,
  isHighlighted,
  setRef,
}: {
  row: ItemWithStock;
  isHighlighted: boolean;
  setRef: (el: HTMLTableRowElement | null) => void;
}) {
  const lowStock = row.totalQuantity <= row.reorderPoint && row.reorderPoint > 0;
  const days = daysUntil(row.nearestExpiry);
  const expirySoon = days !== null && days <= 30 && days >= 0;
  const expired = days !== null && days < 0;

  const rowBg = lowStock
    ? "bg-red-50"
    : expirySoon || expired
      ? "bg-amber-50"
      : "";

  return (
    <tr
      ref={setRef}
      className={`border-t border-zinc-100 ${rowBg} ${
        isHighlighted
          ? "outline outline-2 outline-[#00b5ad] outline-offset-[-2px]"
          : ""
      } transition-[outline]`}
    >
      <td className="px-4 py-3 font-medium text-zinc-900">
        <Link
          href={`/items/${row.id}`}
          className="hover:text-[#00b5ad] hover:underline"
        >
          {row.name}
        </Link>
        <div className="text-xs text-zinc-500">単位: {row.unit}</div>
      </td>
      <td className="px-4 py-3 text-zinc-600">
        {CATEGORY_LABEL[row.category] ?? row.category}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{row.totalQuantity}</td>
      <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
        {row.reorderPoint}
      </td>
      <td className="px-4 py-3 text-zinc-600 tabular-nums">
        {formatDate(row.nearestExpiry)}
        {days !== null && (
          <div className="text-xs text-zinc-500">
            {expired ? `${Math.abs(days)}日経過` : `あと${days}日`}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {lowStock ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
            発注必要
          </span>
        ) : expired ? (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            期限切れ
          </span>
        ) : expirySoon ? (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            期限間近
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            良好
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Link
            href="/stock-in"
            className="inline-flex h-12 min-w-[64px] items-center justify-center rounded-xl bg-[#00b5ad] px-4 text-sm font-medium text-white hover:bg-[#008f88] active:scale-95"
          >
            入庫
          </Link>
          <Link
            href="/stock-out"
            className="inline-flex h-12 min-w-[64px] items-center justify-center rounded-xl border border-[#00b5ad] px-4 text-sm font-medium text-[#00b5ad] hover:bg-[#e6f7f6] active:scale-95"
          >
            出庫
          </Link>
        </div>
      </td>
    </tr>
  );
};

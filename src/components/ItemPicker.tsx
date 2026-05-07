"use client";

import { QrScanner } from "@/components/QrScanner";
import { useEffect, useState } from "react";

export type PickableItem = {
  id: string;
  name: string;
  unit: string;
  category: string;
  totalQuantity: number;
  reorderPoint: number;
};

type Props = {
  selected: PickableItem | null;
  onSelect: (item: PickableItem | null) => void;
  clinicId: string;
  onScanError?: (message: string) => void;
};

type ItemDetailResponse = {
  item: {
    id: string;
    name: string;
    unit: string;
    category: string;
    reorderPoint: number;
    clinicId: string;
    inventory: Array<{ quantity: number }>;
  };
};

async function fetchItemAsPickable(
  itemId: string,
  expectedClinicId: string,
): Promise<PickableItem | { error: string }> {
  const res = await fetch(`/api/items/${encodeURIComponent(itemId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) {
    return { error: "QRコードに対応する物品が見つかりません" };
  }
  if (!res.ok) {
    return { error: `物品取得に失敗しました (HTTP ${res.status})` };
  }
  const data = (await res.json()) as ItemDetailResponse;
  if (data.item.clinicId !== expectedClinicId) {
    return {
      error: `この物品は別院（${data.item.clinicId}）に登録されています`,
    };
  }
  return {
    id: data.item.id,
    name: data.item.name,
    unit: data.item.unit,
    category: data.item.category,
    reorderPoint: data.item.reorderPoint,
    totalQuantity: data.item.inventory.reduce(
      (sum, inv) => sum + inv.quantity,
      0,
    ),
  };
}

const CATEGORY_LABEL: Record<string, string> = {
  medical: "医薬品",
  consumable: "消耗品",
  reagent: "試薬",
};

export function ItemPicker({
  selected,
  onSelect,
  clinicId,
  onScanError,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickableItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanInlineError, setScanInlineError] = useState<string | null>(null);

  async function handleScanned(scannedId: string) {
    setScanBusy(true);
    setScanInlineError(null);
    const result = await fetchItemAsPickable(scannedId, clinicId);
    setScanBusy(false);
    setScannerOpen(false);
    if ("error" in result) {
      if (onScanError) onScanError(result.error);
      else setScanInlineError(result.error);
      return;
    }
    onSelect(result);
  }

  useEffect(() => {
    if (selected) return;
    let cancelled = false;
    setLoading(true);
    const url = new URL("/api/items", window.location.origin);
    url.searchParams.set("clinicId", clinicId);
    if (query.trim() !== "") url.searchParams.set("search", query.trim());
    const t = setTimeout(() => {
      fetch(url.toString(), { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data: { items: PickableItem[] }) => {
          if (!cancelled) setResults(data.items.slice(0, 20));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, selected, clinicId]);

  if (selected) {
    return (
      <div className="rounded-xl border border-[#00b5ad] bg-[#e6f7f6] p-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-zinc-900">
            {selected.name}
          </div>
          <div className="text-sm text-zinc-600 mt-1">
            {CATEGORY_LABEL[selected.category] ?? selected.category} · 単位{" "}
            {selected.unit} · 在庫 {selected.totalQuantity}
            {selected.unit}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
          className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-[#00b5ad] active:scale-95"
        >
          変更
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="物品名・YJ・JANで検索"
          className="h-12 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
        />
        <button
          type="button"
          onClick={() => {
            setScanInlineError(null);
            setScannerOpen(true);
          }}
          disabled={scanBusy}
          className="inline-flex h-12 min-w-[56px] items-center justify-center rounded-xl border border-[#00b5ad] bg-white px-4 text-[#00b5ad] hover:bg-[#e6f7f6] active:scale-95 disabled:opacity-50"
          aria-label="QRスキャン"
        >
          <span aria-hidden className="text-xl">
            {scanBusy ? "…" : "⊞"}
          </span>
        </button>
      </div>
      {scanInlineError && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {scanInlineError}
        </div>
      )}
      {scannerOpen && (
        <QrScanner
          onScan={handleScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-zinc-200 bg-white shadow-lg max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-zinc-500">検索中...</div>
          )}
          {!loading && results !== null && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-zinc-500">
              該当する物品がありません
            </div>
          )}
          {!loading &&
            results?.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                  setQuery("");
                }}
                className="block w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0 min-h-[56px]"
              >
                <div className="font-medium text-zinc-900">{item.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {CATEGORY_LABEL[item.category] ?? item.category} · 在庫{" "}
                  {item.totalQuantity}
                  {item.unit}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

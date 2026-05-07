"use client";

import { Header } from "@/components/Header";
import { ItemPicker, type PickableItem } from "@/components/ItemPicker";
import { Toast } from "@/components/Toast";
import { DEFAULT_CLINIC_ID } from "@/lib/clinic";
import { useEffect, useState } from "react";

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

type Reason = "treatment" | "discard" | "move" | "other";

const REASON_OPTIONS: Array<{ value: Reason; label: string; type: string }> = [
  { value: "treatment", label: "診療用", type: "out" },
  { value: "discard", label: "廃棄", type: "discard" },
  { value: "move", label: "移動", type: "move" },
  { value: "other", label: "その他", type: "out" },
];

export default function StockOutPage() {
  const [item, setItem] = useState<PickableItem | null>(null);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [patientId, setPatientId] = useState("");
  const [vetId, setVetId] = useState("");
  const [reason, setReason] = useState<Reason>("treatment");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!item) {
      setCurrentStock(null);
      return;
    }
    setCurrentStock(item.totalQuantity);
    let cancelled = false;
    fetch(
      `/api/items?clinicId=${encodeURIComponent(DEFAULT_CLINIC_ID)}&search=${encodeURIComponent(item.name)}`,
      { cache: "no-store" },
    )
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: PickableItem[] }) => {
        if (cancelled) return;
        const fresh = data.items.find((x) => x.id === item.id);
        if (fresh) setCurrentStock(fresh.totalQuantity);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item]);

  const qtyNum = Number(quantity);
  const qtyValid =
    quantity.trim() !== "" && Number.isFinite(qtyNum) && qtyNum > 0;
  const overStock =
    qtyValid && currentStock !== null && qtyNum > currentStock;
  const canSubmit = item !== null && qtyValid && !overStock && !submitting;

  function resetForm() {
    setItem(null);
    setQuantity("");
    setPatientId("");
    setVetId("");
    setReason("treatment");
    setMemo("");
    setCurrentStock(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !item) return;
    setSubmitting(true);
    try {
      const reasonOpt = REASON_OPTIONS.find((r) => r.value === reason);
      const txType = reasonOpt?.type ?? "out";
      const noteParts: string[] = [];
      if (reason === "other") noteParts.push("その他");
      if (memo.trim()) noteParts.push(memo.trim());

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          clinicId: DEFAULT_CLINIC_ID,
          type: txType,
          quantity: qtyNum,
          patientId: patientId.trim() || null,
          vetId: vetId.trim() || null,
          note: noteParts.length > 0 ? noteParts.join(" / ") : null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setToast({
        tone: "success",
        message: `${item.name} を ${qtyNum}${item.unit} 出庫しました`,
      });
      resetForm();
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "出庫に失敗しました",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="出庫" showAlertBadge />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="物品" required>
            <ItemPicker
              selected={item}
              onSelect={setItem}
              clinicId={DEFAULT_CLINIC_ID}
            />
          </Field>

          {item && currentStock !== null && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="text-sm text-zinc-500">現在の在庫数</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1 tabular-nums">
                {currentStock} {item.unit}
              </div>
            </div>
          )}

          <Field label="数量" required>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="例: 5"
              className={`h-12 w-full rounded-xl border bg-white px-4 text-base focus:outline-none focus:ring-2 ${
                overStock
                  ? "border-red-500 focus:ring-red-500/20"
                  : "border-zinc-200 focus:border-[#00b5ad] focus:ring-[#00b5ad]/20"
              }`}
            />
            {overStock && currentStock !== null && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                在庫不足です。現在庫 {currentStock}
                {item?.unit ?? ""} を超えています。
              </div>
            )}
          </Field>

          <Field label="出庫理由" required>
            <div className="grid grid-cols-2 gap-2">
              {REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReason(opt.value)}
                  className={`h-12 rounded-xl border px-4 text-base font-medium transition active:scale-95 ${
                    reason === opt.value
                      ? "border-[#00b5ad] bg-[#e6f7f6] text-[#00b5ad]"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-[#00b5ad]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="患者ID">
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="任意"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <Field label="担当獣医師">
            <input
              type="text"
              value={vetId}
              onChange={(e) => setVetId(e.target.value)}
              placeholder="任意"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <Field label="メモ">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="任意"
              rows={3}
              className="min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-14 w-full rounded-xl bg-[#00b5ad] text-base font-semibold text-white shadow-sm hover:bg-[#008f88] active:scale-[0.99] disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {submitting ? "登録中..." : "出庫する"}
          </button>
        </form>
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700 mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

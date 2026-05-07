"use client";

import { Header } from "@/components/Header";
import { ItemPicker, type PickableItem } from "@/components/ItemPicker";
import { Toast } from "@/components/Toast";
import { DEFAULT_CLINIC_ID } from "@/lib/clinic";
import { useState } from "react";

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

export default function StockInPage() {
  const [item, setItem] = useState<PickableItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const qtyNum = Number(quantity);
  const canSubmit =
    item !== null &&
    quantity.trim() !== "" &&
    Number.isFinite(qtyNum) &&
    qtyNum > 0 &&
    !submitting;

  function resetForm() {
    setItem(null);
    setQuantity("");
    setLotNumber("");
    setExpiryDate("");
    setLocation("");
    setDeliveryNote("");
    setMemo("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !item) return;
    setSubmitting(true);
    try {
      const noteParts: string[] = [];
      if (deliveryNote.trim()) noteParts.push(`納品書: ${deliveryNote.trim()}`);
      if (memo.trim()) noteParts.push(memo.trim());

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          clinicId: DEFAULT_CLINIC_ID,
          type: "in",
          quantity: qtyNum,
          lotNumber: lotNumber.trim() || null,
          expiryDate: expiryDate || null,
          location: location.trim() || null,
          note: noteParts.length > 0 ? noteParts.join(" / ") : null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setToast({
        tone: "success",
        message: `${item.name} を ${qtyNum}${item.unit} 入庫しました`,
      });
      resetForm();
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "入庫に失敗しました",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="入庫" showAlertBadge />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="物品" required>
            <ItemPicker
              selected={item}
              onSelect={setItem}
              clinicId={DEFAULT_CLINIC_ID}
              onScanError={(message) => setToast({ tone: "error", message })}
            />
          </Field>

          <Field label="数量" required>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="例: 100"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <Field label="ロット番号">
            <input
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="例: A1234"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <Field label="有効期限">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <Field label="保管場所">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例: 冷蔵庫A-2"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <Field label="納品書番号">
            <input
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
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
            {submitting ? "登録中..." : "入庫する"}
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

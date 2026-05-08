"use client";

import { TextAreaField, TextField } from "@/components/Field";
import { Header } from "@/components/Header";
import { ItemPicker, type PickableItem } from "@/components/ItemPicker";
import { Toast } from "@/components/Toast";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import { useState } from "react";

export default function StockInPage() {
  const { clinicId } = useClinic();
  const { toast, showSuccess, showError, dismiss } = useToast();
  const [item, setItem] = useState<PickableItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

      await api.createTransaction({
        itemId: item.id,
        clinicId,
        type: "in",
        quantity: qtyNum,
        lotNumber: lotNumber.trim() || null,
        expiryDate: expiryDate || null,
        location: location.trim() || null,
        note: noteParts.length > 0 ? noteParts.join(" / ") : null,
      });
      showSuccess(`${item.name} を ${qtyNum}${item.unit} 入庫しました`);
      resetForm();
    } catch (err) {
      showError(err instanceof Error ? err.message : "入庫に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="入庫" showAlertBadge />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="block">
            <span className="block text-sm font-medium text-zinc-700 mb-2">
              物品<span className="text-red-600 ml-1">*</span>
            </span>
            <ItemPicker
              selected={item}
              onSelect={setItem}
              clinicId={clinicId}
              onScanError={(message) => showError(message)}
            />
          </div>

          <TextField
            label="数量"
            required
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={quantity}
            onChange={setQuantity}
            placeholder="例: 100"
          />

          <TextField
            label="ロット番号"
            value={lotNumber}
            onChange={setLotNumber}
            placeholder="例: A1234"
          />

          <TextField
            label="有効期限"
            type="date"
            value={expiryDate}
            onChange={setExpiryDate}
          />

          <TextField
            label="保管場所"
            value={location}
            onChange={setLocation}
            placeholder="例: 冷蔵庫A-2"
          />

          <TextField
            label="納品書番号"
            value={deliveryNote}
            onChange={setDeliveryNote}
            placeholder="任意"
          />

          <TextAreaField
            label="メモ"
            value={memo}
            onChange={setMemo}
            placeholder="任意"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-14 w-full rounded-xl bg-peco-secondary text-base font-semibold text-white shadow-sm hover:bg-peco-secondary-dark active:scale-[0.99] disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {submitting ? "登録中..." : "入庫する"}
          </button>
        </form>
      </main>
      {toast && (
        <Toast tone={toast.tone} message={toast.message} onDismiss={dismiss} />
      )}
    </div>
  );
}

"use client";

import { TextAreaField, TextField } from "@/components/Field";
import { Header } from "@/components/Header";
import { ItemPicker, type PickableItem } from "@/components/ItemPicker";
import { Toast } from "@/components/Toast";
import type { TransactionType } from "@/constants";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import { useEffect, useState } from "react";

type Reason = "treatment" | "discard" | "move" | "other";

const REASON_OPTIONS: Array<{
  value: Reason;
  label: string;
  type: TransactionType;
}> = [
  { value: "treatment", label: "診療用", type: "out" },
  { value: "discard", label: "廃棄", type: "discard" },
  { value: "move", label: "移動", type: "move" },
  { value: "other", label: "その他", type: "out" },
];

export default function StockOutPage() {
  const { clinicId } = useClinic();
  const { toast, showSuccess, showError, dismiss } = useToast();
  const [item, setItem] = useState<PickableItem | null>(null);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [patientId, setPatientId] = useState("");
  const [vetId, setVetId] = useState("");
  const [reason, setReason] = useState<Reason>("treatment");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) {
      setCurrentStock(null);
      return;
    }
    setCurrentStock(item.totalQuantity);
    let cancelled = false;
    api
      .listItems({ clinicId, search: item.name })
      .then((data) => {
        if (cancelled) return;
        const fresh = data.items.find((x) => x.id === item.id);
        if (fresh) setCurrentStock(fresh.totalQuantity);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item, clinicId]);

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

      await api.createTransaction({
        itemId: item.id,
        clinicId,
        type: txType,
        quantity: qtyNum,
        patientId: patientId.trim() || null,
        vetId: vetId.trim() || null,
        note: noteParts.length > 0 ? noteParts.join(" / ") : null,
      });
      showSuccess(`${item.name} を ${qtyNum}${item.unit} 出庫しました`);
      resetForm();
    } catch (err) {
      showError(err instanceof Error ? err.message : "出庫に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="出庫" showAlertBadge />
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

          {item && currentStock !== null && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="text-sm text-zinc-500">現在の在庫数</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1 tabular-nums">
                {currentStock} {item.unit}
              </div>
            </div>
          )}

          <TextField
            label="数量"
            required
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={quantity}
            onChange={setQuantity}
            placeholder="例: 5"
            error={
              overStock && currentStock !== null
                ? `在庫不足です。現在庫 ${currentStock}${item?.unit ?? ""} を超えています。`
                : undefined
            }
          />

          <div className="block">
            <span className="block text-sm font-medium text-zinc-700 mb-2">
              出庫理由<span className="text-red-600 ml-1">*</span>
            </span>
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
          </div>

          <TextField
            label="患者ID"
            value={patientId}
            onChange={setPatientId}
            placeholder="任意"
          />

          <TextField
            label="担当獣医師"
            value={vetId}
            onChange={setVetId}
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
            className="h-14 w-full rounded-xl bg-[#00b5ad] text-base font-semibold text-white shadow-sm hover:bg-[#008f88] active:scale-[0.99] disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {submitting ? "登録中..." : "出庫する"}
          </button>
        </form>
      </main>
      {toast && (
        <Toast tone={toast.tone} message={toast.message} onDismiss={dismiss} />
      )}
    </div>
  );
}

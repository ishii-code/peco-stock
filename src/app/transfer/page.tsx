"use client";

import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextField } from "@/components/Field";
import { Header } from "@/components/Header";
import { ItemPicker, type PickableItem } from "@/components/ItemPicker";
import { CenteredSpinner } from "@/components/Spinner";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import type { Clinic, TransactionWithItem } from "@/types";
import { useEffect, useState } from "react";

function formatDateTime(date: string): string {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ja-JP");
}

export default function TransferPage() {
  const { toast, showSuccess, showError, dismiss } = useToast();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [fromClinic, setFromClinic] = useState("");
  const [toClinic, setToClinic] = useState("");
  const [item, setItem] = useState<PickableItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [transfers, setTransfers] = useState<TransactionWithItem[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .listClinics()
      .then((data) => {
        setClinics(data.clinics);
        if (data.clinics[0]) {
          setFromClinic((curr) => curr || data.clinics[0].id);
        }
        if (data.clinics[1]) {
          setToClinic((curr) => curr || data.clinics[1].id);
        }
      })
      .catch(() => {});
    api
      .listTransfers({})
      .then((data) => setTransfers(data.transfers))
      .catch(() => setTransfers([]));
  }, []);

  async function refreshTransfers() {
    try {
      const data = await api.listTransfers({});
      setTransfers(data.transfers);
    } catch {
      // toast handles user-visible errors elsewhere
    }
  }

  const qtyNum = Number(quantity);
  const qtyValid = quantity.trim() !== "" && Number.isFinite(qtyNum) && qtyNum > 0;
  const overStock = qtyValid && item !== null && qtyNum > item.totalQuantity;
  const sameClinic =
    fromClinic !== "" && toClinic !== "" && fromClinic === toClinic;
  const canSubmit =
    fromClinic.trim() !== "" &&
    toClinic.trim() !== "" &&
    !sameClinic &&
    item !== null &&
    qtyValid &&
    !overStock &&
    !submitting;

  async function submit() {
    if (!canSubmit || !item) return;
    setSubmitting(true);
    try {
      await api.createTransfer({
        fromClinicId: fromClinic,
        toClinicId: toClinic,
        items: [{ itemId: item.id, quantity: qtyNum }],
        note: note.trim() || null,
      });
      showSuccess(`${item.name} を ${qtyNum}${item.unit} 移動しました`);
      setItem(null);
      setQuantity("");
      setNote("");
      await refreshTransfers();
    } catch (err) {
      showError(err instanceof Error ? err.message : "移動に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="院間移動" showAlertBadge />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 space-y-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">新規移動</h2>

          {clinics.length < 2 && (
            <ErrorBanner
              tone="warning"
              message={`現在 ${clinics.length} 院しか登録されていません。物品登録時に異なる clinicId を指定して別院を作成してください。`}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ClinicField
              label="送出元院"
              required
              value={fromClinic}
              onChange={setFromClinic}
              clinics={clinics}
            />
            <ClinicField
              label="送出先院"
              required
              value={toClinic}
              onChange={setToClinic}
              clinics={clinics}
              allowEmpty
            />
          </div>

          {sameClinic && (
            <ErrorBanner message="同一院間の移動はできません" />
          )}

          <div className="block">
            <span className="block text-sm font-medium text-zinc-700 mb-2">
              物品<span className="text-red-600 ml-1">*</span>
            </span>
            {fromClinic ? (
              <ItemPicker
                key={fromClinic}
                selected={item}
                onSelect={setItem}
                clinicId={fromClinic}
                onScanError={(message) => showError(message)}
              />
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                先に送出元院を選択してください
              </div>
            )}
          </div>

          <TextField
            label="数量"
            required
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={quantity}
            onChange={setQuantity}
            placeholder="例: 10"
            error={
              overStock && item
                ? `送出元の在庫 ${item.totalQuantity}${item.unit} を超えています`
                : undefined
            }
          />

          <TextField
            label="メモ"
            value={note}
            onChange={setNote}
            placeholder="任意"
          />

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="h-14 w-full rounded-xl bg-peco-secondary text-base font-semibold text-white hover:bg-peco-secondary-dark disabled:bg-zinc-300"
          >
            {submitting ? "移動中..." : "移動する"}
          </button>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">移動履歴</h2>
          {transfers === null ? (
            <CenteredSpinner />
          ) : transfers.length === 0 ? (
            <EmptyState message="移動履歴がありません" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">日時</th>
                    <th className="px-4 py-3 text-left font-medium">院</th>
                    <th className="px-4 py-3 text-left font-medium">物品</th>
                    <th className="px-4 py-3 text-right font-medium">数量</th>
                    <th className="px-4 py-3 text-left font-medium">方向</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((tx) => (
                    <tr key={tx.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3 tabular-nums text-zinc-700">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                        {tx.clinicId}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {tx.item.name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {tx.quantity} {tx.item.unit}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600">
                        {tx.note ?? "—"}
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

function ClinicField({
  label,
  required,
  value,
  onChange,
  clinics,
  allowEmpty,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  clinics: Clinic[];
  allowEmpty?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700 mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </span>
      {clinics.length > 0 ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-peco-secondary focus:outline-none"
        >
          {allowEmpty && <option value="">— 選択 —</option>}
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例: clinic-2"
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-peco-secondary focus:outline-none"
        />
      )}
    </label>
  );
}

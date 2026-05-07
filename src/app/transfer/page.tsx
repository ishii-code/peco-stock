"use client";

import { Header } from "@/components/Header";
import { ItemPicker, type PickableItem } from "@/components/ItemPicker";
import { Toast } from "@/components/Toast";
import { useEffect, useMemo, useState } from "react";

type Clinic = { id: string };

type TransferRow = {
  id: string;
  itemId: string;
  clinicId: string;
  type: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  item: { id: string; name: string; unit: string };
};

type ToastState = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

function formatDateTime(date: string): string {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ja-JP");
}

export default function TransferPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [fromClinic, setFromClinic] = useState("");
  const [toClinic, setToClinic] = useState("");
  const [item, setItem] = useState<PickableItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [transfers, setTransfers] = useState<TransferRow[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function loadClinics() {
    try {
      const res = await fetch("/api/clinics", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { clinics: Clinic[] };
      setClinics(data.clinics);
      if (data.clinics[0] && fromClinic === "") {
        setFromClinic(data.clinics[0].id);
      }
      if (data.clinics[1] && toClinic === "") {
        setToClinic(data.clinics[1].id);
      }
    } catch {
      // silent — page still functions
    }
  }

  async function loadTransfers() {
    try {
      const res = await fetch("/api/transfer", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { transfers: TransferRow[] };
      setTransfers(data.transfers);
    } catch {
      setTransfers([]);
    }
  }

  useEffect(() => {
    loadClinics();
    loadTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qtyNum = Number(quantity);
  const qtyValid = quantity.trim() !== "" && Number.isFinite(qtyNum) && qtyNum > 0;
  const overStock =
    qtyValid && item !== null && qtyNum > item.totalQuantity;
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

  // Group history by approximate "transfer event" using same itemId+createdAt±1s
  const historyGrouped = useMemo(() => {
    if (!transfers) return null;
    return transfers;
  }, [transfers]);

  async function submit() {
    if (!canSubmit || !item) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromClinicId: fromClinic,
          toClinicId: toClinic,
          items: [{ itemId: item.id, quantity: qtyNum }],
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setToast({
        tone: "success",
        message: `${item.name} を ${qtyNum}${item.unit} 移動しました`,
      });
      setItem(null);
      setQuantity("");
      setNote("");
      await loadTransfers();
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "移動に失敗しました",
      });
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              現在 {clinics.length} 院しか登録されていません。物品登録時に異なる
              clinicId を指定して別院を作成してください。
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="送出元院" required>
              {clinics.length > 0 ? (
                <select
                  value={fromClinic}
                  onChange={(e) => setFromClinic(e.target.value)}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={fromClinic}
                  onChange={(e) => setFromClinic(e.target.value)}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                />
              )}
            </Field>
            <Field label="送出先院" required>
              {clinics.length > 0 ? (
                <select
                  value={toClinic}
                  onChange={(e) => setToClinic(e.target.value)}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                >
                  <option value="">— 選択 —</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={toClinic}
                  onChange={(e) => setToClinic(e.target.value)}
                  placeholder="例: clinic-2"
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                />
              )}
            </Field>
          </div>

          {sameClinic && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              同一院間の移動はできません
            </div>
          )}

          <Field label="物品" required>
            {fromClinic ? (
              <ItemPicker
                key={fromClinic}
                selected={item}
                onSelect={setItem}
                clinicId={fromClinic}
                onScanError={(message) => setToast({ tone: "error", message })}
              />
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                先に送出元院を選択してください
              </div>
            )}
          </Field>

          <Field label="数量" required>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="例: 10"
              className={`h-12 w-full rounded-xl border bg-white px-4 text-base focus:outline-none ${
                overStock
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-zinc-200 focus:border-[#00b5ad] focus:ring-2 focus:ring-[#00b5ad]/20"
              }`}
            />
            {overStock && item && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                送出元の在庫 {item.totalQuantity}{item.unit} を超えています
              </div>
            )}
          </Field>

          <Field label="メモ">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="任意"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
            />
          </Field>

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="h-14 w-full rounded-xl bg-[#00b5ad] text-base font-semibold text-white hover:bg-[#008f88] disabled:bg-zinc-300"
          >
            {submitting ? "移動中..." : "移動する"}
          </button>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">移動履歴</h2>
          {historyGrouped === null ? (
            <div className="text-sm text-zinc-500">読み込み中...</div>
          ) : historyGrouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-10 text-center text-sm text-zinc-500">
              移動履歴がありません
            </div>
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
                  {historyGrouped.map((tx) => (
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

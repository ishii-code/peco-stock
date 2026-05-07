"use client";

import { Header } from "@/components/Header";
import { QrCard } from "@/components/QrCard";
import { Toast } from "@/components/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

type ItemDetail = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number | null;
  yjCode: string | null;
  janCode: string | null;
  reorderPoint: number;
  minStock: number;
  storageTemp: string;
  animalType: string;
  requiresPrescription: boolean;
  toxicClass: string | null;
  qrCode: string | null;
  notes: string | null;
  clinicId: string;
  inventory: Array<{
    id: string;
    quantity: number;
    lotNumber: string | null;
    expiryDate: string | null;
    location: string | null;
  }>;
};

type TransactionRow = {
  id: string;
  type: string;
  quantity: number;
  lotNumber: string | null;
  patientId: string | null;
  vetId: string | null;
  note: string | null;
  createdAt: string;
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
const STORAGE_LABEL: Record<string, string> = {
  normal: "常温",
  refrigerated: "冷蔵",
  frozen: "冷凍",
};
const ANIMAL_LABEL: Record<string, string> = {
  dog: "犬",
  cat: "猫",
  both: "両方",
};
const TX_TYPE_LABEL: Record<string, string> = {
  in: "入庫",
  out: "出庫",
  move: "移動",
  discard: "廃棄",
  adjust: "調整",
};

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

function formatDateTime(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP");
}

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [history, setHistory] = useState<TransactionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // edit fields
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editReorder, setEditReorder] = useState("");
  const [editMinStock, setEditMinStock] = useState("");
  const [editNotes, setEditNotes] = useState("");

  async function load() {
    setError(null);
    try {
      const [detailRes, txRes] = await Promise.all([
        fetch(`/api/items/${id}`, { cache: "no-store" }),
        fetch(`/api/transactions?itemId=${id}`, { cache: "no-store" }),
      ]);
      if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status}`);
      const detail = (await detailRes.json()) as { item: ItemDetail };
      setItem(detail.item);
      setEditName(detail.item.name);
      setEditPrice(detail.item.price?.toString() ?? "");
      setEditReorder(detail.item.reorderPoint.toString());
      setEditMinStock(detail.item.minStock.toString());
      setEditNotes(detail.item.notes ?? "");
      if (txRes.ok) {
        const tx = (await txRes.json()) as { transactions: TransactionRow[] };
        setHistory(tx.transactions.slice(0, 20));
      } else {
        setHistory([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    if (!item) return;
    setSaving(true);
    try {
      const priceNum = editPrice.trim() === "" ? null : Number(editPrice);
      const res = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          price: priceNum === null ? null : Number.isFinite(priceNum) ? priceNum : null,
          reorderPoint: Number(editReorder),
          minStock: Number(editMinStock),
          notes: editNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setToast({ tone: "success", message: "更新しました" });
      setEditing(false);
      await load();
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "更新に失敗しました",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    const ok = window.confirm(
      `「${item.name}」を削除します。関連する在庫・取引・アラートもすべて削除されます。よろしいですか?`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.push("/inventory");
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "削除に失敗しました",
      });
      setDeleting(false);
    }
  }

  if (!item && !error) {
    return (
      <div className="flex flex-1 flex-col">
        <Header title="物品詳細" />
        <main className="flex-1 flex items-center justify-center text-zinc-500">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#00b5ad] border-t-transparent" />
          <span className="ml-3">読み込み中...</span>
        </main>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex flex-1 flex-col">
        <Header title="物品詳細" />
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? "物品が見つかりません"}
          </div>
        </main>
      </div>
    );
  }

  const totalQuantity = item.inventory.reduce((s, inv) => s + inv.quantity, 0);

  return (
    <div className="flex flex-1 flex-col">
      <Header title="物品詳細" showAlertBadge />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">{item.name}</h2>
                <div className="text-sm text-zinc-500 mt-1">
                  {CATEGORY_LABEL[item.category] ?? item.category} · 単位 {item.unit}
                </div>
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#00b5ad] bg-white px-4 text-sm font-medium text-[#00b5ad] hover:bg-[#e6f7f6] active:scale-95"
                >
                  編集
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <Field label="品名">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                  />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="薬価">
                    <input
                      type="number"
                      step="any"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                    />
                  </Field>
                  <Field label="発注点">
                    <input
                      type="number"
                      value={editReorder}
                      onChange={(e) => setEditReorder(e.target.value)}
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                    />
                  </Field>
                  <Field label="最小在庫">
                    <input
                      type="number"
                      value={editMinStock}
                      onChange={(e) => setEditMinStock(e.target.value)}
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                    />
                  </Field>
                </div>
                <Field label="メモ">
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base focus:border-[#00b5ad] focus:outline-none"
                  />
                </Field>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="flex-1 h-12 rounded-xl bg-[#00b5ad] text-sm font-semibold text-white hover:bg-[#008f88] disabled:bg-zinc-300"
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex-1 h-12 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-700"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Info label="現在庫">
                  <span className="text-2xl font-bold text-[#00b5ad] tabular-nums">
                    {totalQuantity}
                  </span>{" "}
                  {item.unit}
                </Info>
                <Info label="発注点">
                  {item.reorderPoint} {item.unit}
                </Info>
                <Info label="最小在庫">
                  {item.minStock} {item.unit}
                </Info>
                <Info label="薬価">
                  {item.price !== null ? `¥${item.price.toLocaleString()}` : "—"}
                </Info>
                <Info label="保管温度">
                  {STORAGE_LABEL[item.storageTemp] ?? item.storageTemp}
                </Info>
                <Info label="適応動物">
                  {ANIMAL_LABEL[item.animalType] ?? item.animalType}
                </Info>
                <Info label="YJコード">{item.yjCode ?? "—"}</Info>
                <Info label="JANコード">{item.janCode ?? "—"}</Info>
                <Info label="処方箋">
                  {item.requiresPrescription ? "要" : "不要"}
                </Info>
                <Info label="毒劇薬区分">{item.toxicClass ?? "—"}</Info>
                <Info label="メモ" wide>
                  {item.notes ?? "—"}
                </Info>
              </dl>
            )}
          </section>

          {item.qrCode && (
            <div className="flex justify-center md:justify-start">
              <QrCard value={item.qrCode} label={item.name} />
            </div>
          )}
        </div>

        <section>
          <h3 className="text-lg font-semibold text-zinc-900 mb-3">ロット別在庫</h3>
          {item.inventory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-8 text-center text-sm text-zinc-500">
              ロットがありません
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">ロット</th>
                    <th className="px-4 py-3 text-right font-medium">数量</th>
                    <th className="px-4 py-3 text-left font-medium">有効期限</th>
                    <th className="px-4 py-3 text-left font-medium">保管場所</th>
                  </tr>
                </thead>
                <tbody>
                  {item.inventory.map((inv) => (
                    <tr key={inv.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                        {inv.lotNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {inv.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-700">
                        {formatDate(inv.expiryDate)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {inv.location ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h3 className="text-lg font-semibold text-zinc-900 mb-3">
            入出庫履歴（直近20件）
          </h3>
          {history === null ? (
            <div className="text-sm text-zinc-500">読み込み中...</div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-8 text-center text-sm text-zinc-500">
              履歴がありません
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">日時</th>
                    <th className="px-4 py-3 text-left font-medium">種別</th>
                    <th className="px-4 py-3 text-right font-medium">数量</th>
                    <th className="px-4 py-3 text-left font-medium">ロット</th>
                    <th className="px-4 py-3 text-left font-medium">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => (
                    <tr key={tx.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3 tabular-nums text-zinc-700">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                          {TX_TYPE_LABEL[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {tx.quantity}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                        {tx.lotNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 max-w-xs truncate">
                        {tx.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="border-t border-zinc-200 pt-6">
          <h3 className="text-lg font-semibold text-red-700 mb-2">削除</h3>
          <p className="text-sm text-zinc-500 mb-3">
            この物品と関連する全データを削除します。元に戻せません。
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="h-12 rounded-xl border border-red-300 bg-white px-5 text-sm font-medium text-red-700 hover:bg-red-50 active:scale-95 disabled:opacity-50"
          >
            {deleting ? "削除中..." : "物品を削除"}
          </button>
        </section>

        <Link
          href="/inventory"
          className="inline-flex items-center text-sm text-[#00b5ad] hover:underline"
        >
          ← 在庫一覧へ戻る
        </Link>
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-zinc-600 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Info({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs text-zinc-500 mb-0.5">{label}</dt>
      <dd className="text-zinc-900">{children}</dd>
    </div>
  );
}

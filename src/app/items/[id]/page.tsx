"use client";

import { ErrorBanner } from "@/components/ErrorBanner";
import { TextAreaField, TextField } from "@/components/Field";
import { Header } from "@/components/Header";
import { QrCard } from "@/components/QrCard";
import { CenteredSpinner } from "@/components/Spinner";
import { Toast } from "@/components/Toast";
import {
  ANIMAL_TYPE_LABEL,
  CATEGORY_LABEL,
  STORAGE_TEMP_LABEL,
  TX_TYPE_LABEL,
} from "@/constants";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import type { ItemWithInventory, TransactionWithItem } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

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
  const { toast, showSuccess, showError, dismiss } = useToast();
  const [item, setItem] = useState<ItemWithInventory | null>(null);
  const [history, setHistory] = useState<TransactionWithItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editReorder, setEditReorder] = useState("");
  const [editMinStock, setEditMinStock] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [detail, tx] = await Promise.all([
        api.getItem(id),
        api.listTransactions({ itemId: id }),
      ]);
      setItem(detail.item);
      setEditName(detail.item.name);
      setEditPrice(detail.item.price?.toString() ?? "");
      setEditReorder(detail.item.reorderPoint.toString());
      setEditMinStock(detail.item.minStock.toString());
      setEditNotes(detail.item.notes ?? "");
      setHistory(tx.transactions.slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!item) return;
    setSaving(true);
    try {
      const priceNum = editPrice.trim() === "" ? null : Number(editPrice);
      await api.updateItem(id, {
        name: editName.trim(),
        price:
          priceNum === null
            ? null
            : Number.isFinite(priceNum)
              ? priceNum
              : null,
        reorderPoint: Number(editReorder),
        minStock: Number(editMinStock),
        notes: editNotes.trim() || null,
      });
      showSuccess("更新しました");
      setEditing(false);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    const ok = window.confirm(
      `「${item.name}」を削除します。よろしいですか?`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deleteItem(id);
      router.push("/inventory");
    } catch (err) {
      showError(err instanceof Error ? err.message : "削除に失敗しました");
      setDeleting(false);
    }
  }

  if (!item && !error) {
    return (
      <div className="flex flex-1 flex-col">
        <Header title="物品詳細" />
        <main className="flex-1 flex items-center justify-center">
          <CenteredSpinner />
        </main>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex flex-1 flex-col">
        <Header title="物品詳細" />
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6">
          <ErrorBanner message={error ?? "物品が見つかりません"} />
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
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-peco-secondary bg-white px-4 text-sm font-medium text-peco-secondary hover:bg-peco-secondary-light active:scale-95"
                >
                  編集
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <TextField label="品名" value={editName} onChange={setEditName} />
                <div className="grid grid-cols-3 gap-3">
                  <TextField
                    label="薬価"
                    type="number"
                    step="any"
                    value={editPrice}
                    onChange={setEditPrice}
                  />
                  <TextField
                    label="発注点"
                    type="number"
                    value={editReorder}
                    onChange={setEditReorder}
                  />
                  <TextField
                    label="最小在庫"
                    type="number"
                    value={editMinStock}
                    onChange={setEditMinStock}
                  />
                </div>
                <TextAreaField
                  label="メモ"
                  value={editNotes}
                  onChange={setEditNotes}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="flex-1 h-12 rounded-xl bg-peco-secondary text-sm font-semibold text-white hover:bg-peco-secondary-dark disabled:bg-zinc-300"
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
                  <span className="text-2xl font-bold text-peco-secondary tabular-nums">
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
                  {STORAGE_TEMP_LABEL[item.storageTemp] ?? item.storageTemp}
                </Info>
                <Info label="適応動物">
                  {ANIMAL_TYPE_LABEL[item.animalType] ?? item.animalType}
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

          <div className="flex justify-center md:justify-start">
            <QrCard value={item.id} label={item.name} />
          </div>
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
            <CenteredSpinner />
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
                          {TX_TYPE_LABEL[tx.type as keyof typeof TX_TYPE_LABEL] ?? tx.type}
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
            この物品と関連する全データを削除します。
            取引履歴がある物品は削除できません（監査証跡保護のため）。
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
          className="inline-flex items-center text-sm text-peco-secondary hover:underline"
        >
          ← 在庫一覧へ戻る
        </Link>
      </main>
      {toast && (
        <Toast tone={toast.tone} message={toast.message} onDismiss={dismiss} />
      )}
    </div>
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

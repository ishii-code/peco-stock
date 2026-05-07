"use client";

import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Header } from "@/components/Header";
import { CenteredSpinner } from "@/components/Spinner";
import { Toast } from "@/components/Toast";
import { ORDER_STATUS_BADGE_CLASS, ORDER_STATUS_LABEL } from "@/constants";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import type { OrderStatus } from "@/constants";
import type { OrderWithItems } from "@/types";
import { useCallback, useEffect, useState } from "react";

type DraftItem = {
  itemId: string;
  name: string;
  unit: string;
  reorderPoint: number;
  currentStock: number;
  price: number | null;
  quantity: string;
};

function formatDateTime(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ja-JP");
}

export default function OrdersPage() {
  const { clinicId } = useClinic();
  const { toast, showSuccess, showError, showInfo, dismiss } = useToast();
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [supplierEmail, setSupplierEmail] = useState("");
  const [note, setNote] = useState("");
  const [orders, setOrders] = useState<OrderWithItems[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCandidates = useCallback(async () => {
    try {
      const data = await api.listItems({ clinicId });
      const candidates = data.items
        .filter(
          (it) => it.reorderPoint > 0 && it.totalQuantity <= it.reorderPoint,
        )
        .map<DraftItem>((it) => ({
          itemId: it.id,
          name: it.name,
          unit: it.unit,
          reorderPoint: it.reorderPoint,
          currentStock: it.totalQuantity,
          price: it.price,
          quantity: String(
            Math.max(it.reorderPoint * 2 - it.totalQuantity, 1),
          ),
        }));
      setDraftItems(candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "候補取得に失敗しました");
    }
  }, [clinicId]);

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.listOrders({ clinicId });
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "発注一覧取得に失敗しました");
    }
  }, [clinicId]);

  useEffect(() => {
    loadCandidates();
    loadOrders();
  }, [loadCandidates, loadOrders]);

  async function createOrder() {
    const items = draftItems
      .map((d) => {
        const qty = Number(d.quantity);
        return Number.isFinite(qty) && qty > 0
          ? { itemId: d.itemId, quantity: qty, price: d.price }
          : null;
      })
      .filter(
        (x): x is { itemId: string; quantity: number; price: number | null } =>
          x !== null,
      );
    if (items.length === 0) {
      showError("発注対象がありません");
      return;
    }
    setBusy(true);
    try {
      await api.createOrder({
        clinicId,
        supplierEmail: supplierEmail.trim() || null,
        note: note.trim() || null,
        items,
      });
      showSuccess("発注書を作成しました");
      setNote("");
      await Promise.all([loadCandidates(), loadOrders()]);
    } catch (err) {
      showError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function sendOrder(orderId: string, fallbackEmail: string | null) {
    let target = fallbackEmail ?? "";
    if (!target) {
      const input = window.prompt("送信先メールアドレスを入力してください");
      if (!input) return;
      target = input.trim();
    }
    setBusy(true);
    try {
      const data = await api.sendOrder(orderId, { supplierEmail: target });
      if (data.email.ok) {
        showSuccess("メール送信し、ステータスを送信済にしました");
      } else {
        showInfo(
          `ステータスを送信済にしました (メール: ${data.email.reason ?? "未設定"})`,
        );
      }
      await loadOrders();
    } catch (err) {
      showError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function receiveOrder(orderId: string) {
    if (!window.confirm("受領を確定し、自動で入庫します。よろしいですか?")) return;
    setBusy(true);
    try {
      await api.receiveOrder(orderId);
      showSuccess("受領処理を完了しました");
      await Promise.all([loadCandidates(), loadOrders()]);
    } catch (err) {
      showError(err instanceof Error ? err.message : "受領に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  function updateDraftQty(itemId: string, value: string) {
    setDraftItems((prev) =>
      prev.map((d) => (d.itemId === itemId ? { ...d, quantity: value } : d)),
    );
  }

  function removeFromDraft(itemId: string) {
    setDraftItems((prev) => prev.filter((d) => d.itemId !== itemId));
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="発注" showAlertBadge />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-8">
        {error && <ErrorBanner message={error} />}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900">発注候補</h2>
            <span className="text-xs text-zinc-500">
              発注点を下回った物品を自動表示しています
            </span>
          </div>

          {draftItems.length === 0 ? (
            <EmptyState message="発注点を下回った物品はありません" />
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">物品</th>
                      <th className="px-4 py-3 text-right font-medium">在庫</th>
                      <th className="px-4 py-3 text-right font-medium">発注点</th>
                      <th className="px-4 py-3 text-right font-medium">発注数</th>
                      <th className="px-4 py-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftItems.map((d) => (
                      <tr key={d.itemId} className="border-t border-zinc-100">
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {d.name}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-700 font-semibold">
                          {d.currentStock} {d.unit}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
                          {d.reorderPoint} {d.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={d.quantity}
                            onChange={(e) => updateDraftQty(d.itemId, e.target.value)}
                            className="h-12 w-24 rounded-xl border border-zinc-200 bg-white px-3 text-right text-base tabular-nums focus:border-[#00b5ad] focus:outline-none"
                          />
                          <span className="ml-2 text-xs text-zinc-500">
                            {d.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeFromDraft(d.itemId)}
                            className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-600 hover:border-red-300 hover:text-red-700"
                          >
                            除外
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="block text-sm font-medium text-zinc-700 mb-2">
                      発注先メール
                    </span>
                    <input
                      type="email"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      placeholder="supplier@example.com"
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-zinc-700 mb-2">
                      備考
                    </span>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="任意"
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={createOrder}
                  disabled={busy || draftItems.length === 0}
                  className="h-14 w-full rounded-xl bg-[#00b5ad] text-base font-semibold text-white hover:bg-[#008f88] disabled:bg-zinc-300"
                >
                  {busy ? "作成中..." : "発注書を作成"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">発注書一覧</h2>
          {orders === null ? (
            <CenteredSpinner />
          ) : orders.length === 0 ? (
            <EmptyState message="発注書がありません" />
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            ORDER_STATUS_BADGE_CLASS[order.status as OrderStatus] ?? "bg-zinc-100"
                          }`}
                        >
                          {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}
                        </span>
                        <code className="text-xs text-zinc-500">
                          {order.id.slice(-8)}
                        </code>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        作成: {formatDateTime(order.createdAt)}
                        {order.sentAt && ` · 送信: ${formatDateTime(order.sentAt)}`}
                        {order.receivedAt &&
                          ` · 受領: ${formatDateTime(order.receivedAt)}`}
                      </div>
                      {order.supplierEmail && (
                        <div className="text-xs text-zinc-500 mt-1">
                          宛先: {order.supplierEmail}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {order.status === "draft" && (
                        <button
                          type="button"
                          onClick={() => sendOrder(order.id, order.supplierEmail)}
                          disabled={busy}
                          className="h-12 rounded-xl bg-[#00b5ad] px-4 text-sm font-medium text-white hover:bg-[#008f88] disabled:opacity-50"
                        >
                          メール送信
                        </button>
                      )}
                      {order.status === "sent" && (
                        <button
                          type="button"
                          onClick={() => receiveOrder(order.id)}
                          disabled={busy}
                          className="h-12 rounded-xl border border-[#00b5ad] bg-white px-4 text-sm font-medium text-[#00b5ad] hover:bg-[#e6f7f6] disabled:opacity-50"
                        >
                          受領確認
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="text-sm text-zinc-700 space-y-1">
                    {order.items.map((oi) => (
                      <li
                        key={oi.id}
                        className="flex items-center justify-between border-t border-zinc-100 pt-2"
                      >
                        <span>{oi.item.name}</span>
                        <span className="tabular-nums text-zinc-600">
                          {oi.quantity} {oi.item.unit}
                          {oi.price !== null &&
                            ` · ¥${(oi.price * oi.quantity).toLocaleString()}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      {toast && (
        <Toast tone={toast.tone} message={toast.message} onDismiss={dismiss} />
      )}
    </div>
  );
}

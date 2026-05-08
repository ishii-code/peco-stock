"use client";

import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Header } from "@/components/Header";
import { CenteredSpinner } from "@/components/Spinner";
import { Toast } from "@/components/Toast";
import { DAY_MS } from "@/constants";
import { useClinic } from "@/hooks/useClinic";
import { useFetch } from "@/hooks/useFetch";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import type { AlertWithDetails } from "@/types";
import { useCallback, useState } from "react";

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / DAY_MS);
}

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

export default function AlertsPage() {
  const { clinicId } = useClinic();
  const { toast, showSuccess, showError, showInfo, dismiss } = useToast();
  const [busy, setBusy] = useState(false);

  const loadAlerts = useCallback(
    () => api.listAlerts({ clinicId }),
    [clinicId],
  );
  const { data, error, loading, refetch } = useFetch(loadAlerts, [loadAlerts]);
  const alerts: AlertWithDetails[] = data?.alerts ?? [];

  async function runCheck() {
    setBusy(true);
    try {
      const data = await api.runAlertCheck({ clinicId });
      showInfo(
        `新規アラート: 発注点 ${data.created.reorder}件 / 期限 ${data.created.expiry}件`,
      );
      await refetch();
    } catch (err) {
      showError(err instanceof Error ? err.message : "チェックに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(id: string) {
    try {
      await api.resolveAlert(id);
      showSuccess("解決済みにしました");
      await refetch();
    } catch (err) {
      showError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  const reorderAlerts = alerts.filter(
    (a) => a.type === "reorder" && !a.resolvedAt,
  );
  const expiryAlerts = alerts.filter(
    (a) => a.type === "expiry" && !a.resolvedAt,
  );
  const resolved = alerts.filter((a) => a.resolvedAt);

  return (
    <div className="flex flex-1 flex-col">
      <Header title="アラート" />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-8">
        {error && <ErrorBanner message={error} />}

        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            {loading
              ? "読み込み中..."
              : `未解決 ${reorderAlerts.length + expiryAlerts.length} 件 / 解決済み ${resolved.length} 件`}
          </div>
          <button
            type="button"
            onClick={runCheck}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-peco-secondary bg-white px-5 text-sm font-medium text-peco-secondary hover:bg-peco-secondary-light active:scale-95 disabled:opacity-50"
          >
            {busy ? "チェック中..." : "アラート再チェック"}
          </button>
        </div>

        <Section title="発注点アラート" count={reorderAlerts.length} tone="reorder">
          {loading ? (
            <CenteredSpinner />
          ) : reorderAlerts.length === 0 ? (
            <EmptyState message="発注点を下回った物品はありません" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">物品名</th>
                    <th className="px-4 py-3 text-right font-medium">在庫数</th>
                    <th className="px-4 py-3 text-right font-medium">発注点</th>
                    <th className="px-4 py-3 text-right font-medium">差異</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderAlerts.map((alert) => {
                    const reorderPoint = alert.item?.reorderPoint ?? 0;
                    const diff = alert.currentStock - reorderPoint;
                    return (
                      <tr key={alert.id} className="border-t border-zinc-100">
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {alert.item?.name ?? alert.itemId}
                          <div className="text-xs text-zinc-500">
                            {formatDate(alert.triggeredAt)} 検出
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {alert.currentStock}
                          {alert.item?.unit ?? ""}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
                          {reorderPoint}
                          {alert.item?.unit ?? ""}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-red-700">
                          {diff > 0 ? `+${diff}` : `${diff}`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleResolve(alert.id)}
                            className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-peco-secondary hover:text-peco-secondary active:scale-95"
                          >
                            解決済み
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="有効期限アラート" count={expiryAlerts.length} tone="expiry">
          {loading ? (
            <CenteredSpinner />
          ) : expiryAlerts.length === 0 ? (
            <EmptyState message="有効期限が近い物品はありません" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">物品名</th>
                    <th className="px-4 py-3 text-left font-medium">有効期限</th>
                    <th className="px-4 py-3 text-right font-medium">残日数</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryAlerts.map((alert) => {
                    const days = daysUntil(alert.nearestExpiry);
                    return (
                      <tr key={alert.id} className="border-t border-zinc-100">
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {alert.item?.name ?? alert.itemId}
                          <div className="text-xs text-zinc-500">
                            {formatDate(alert.triggeredAt)} 検出
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-700 tabular-nums">
                          {formatDate(alert.nearestExpiry)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right tabular-nums font-semibold ${
                            days !== null && days < 0
                              ? "text-red-700"
                              : "text-amber-700"
                          }`}
                        >
                          {days === null
                            ? "—"
                            : days < 0
                              ? `${Math.abs(days)}日経過`
                              : `あと${days}日`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleResolve(alert.id)}
                            className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-peco-secondary hover:text-peco-secondary active:scale-95"
                          >
                            解決済み
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </main>
      {toast && (
        <Toast tone={toast.tone} message={toast.message} onDismiss={dismiss} />
      )}
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "reorder" | "expiry";
  children: React.ReactNode;
}) {
  const badgeClass =
    tone === "reorder"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-800";
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        <span
          className={`inline-flex min-w-[28px] h-7 items-center justify-center rounded-full px-2.5 text-xs font-semibold ${badgeClass}`}
        >
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

"use client";

import { Header } from "@/components/Header";
import { Toast } from "@/components/Toast";
import { DEFAULT_CLINIC_ID } from "@/lib/clinic";
import { useEffect, useState } from "react";

type AlertRow = {
  id: string;
  itemId: string;
  type: "reorder" | "expiry" | string;
  triggeredAt: string;
  resolvedAt: string | null;
  currentStock: number;
  nearestExpiry: string | null;
  item: {
    id: string;
    name: string;
    unit: string;
    category: string;
    reorderPoint: number;
  } | null;
};

type ToastState = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function load() {
    setError(null);
    try {
      const url = new URL("/api/alerts", window.location.origin);
      url.searchParams.set("clinicId", DEFAULT_CLINIC_ID);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { alerts: AlertRow[] };
      setAlerts(data.alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      setAlerts([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runCheck() {
    setBusy(true);
    try {
      const res = await fetch("/api/alerts/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicId: DEFAULT_CLINIC_ID }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        created: { reorder: number; expiry: number };
      };
      setToast({
        tone: "info",
        message: `新規アラート: 発注点 ${data.created.reorder}件 / 期限 ${data.created.expiry}件`,
      });
      await load();
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "チェックに失敗しました",
      });
    } finally {
      setBusy(false);
    }
  }

  async function resolveAlert(id: string) {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, { method: "PUT" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setToast({ tone: "success", message: "解決済みにしました" });
      await load();
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "更新に失敗しました",
      });
    }
  }

  const reorderAlerts =
    alerts?.filter((a) => a.type === "reorder" && !a.resolvedAt) ?? [];
  const expiryAlerts =
    alerts?.filter((a) => a.type === "expiry" && !a.resolvedAt) ?? [];
  const resolved = alerts?.filter((a) => a.resolvedAt) ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <Header title="アラート" />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            {alerts === null
              ? "読み込み中..."
              : `未解決 ${reorderAlerts.length + expiryAlerts.length} 件 / 解決済み ${resolved.length} 件`}
          </div>
          <button
            type="button"
            onClick={runCheck}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#00b5ad] bg-white px-5 text-sm font-medium text-[#00b5ad] hover:bg-[#e6f7f6] active:scale-95 disabled:opacity-50"
          >
            {busy ? "チェック中..." : "アラート再チェック"}
          </button>
        </div>

        <Section
          title="発注点アラート"
          count={reorderAlerts.length}
          tone="reorder"
        >
          {reorderAlerts.length === 0 ? (
            <Empty label="発注点を下回った物品はありません" />
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
                            onClick={() => resolveAlert(alert.id)}
                            className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-[#00b5ad] hover:text-[#00b5ad] active:scale-95"
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

        <Section
          title="有効期限アラート"
          count={expiryAlerts.length}
          tone="expiry"
        >
          {expiryAlerts.length === 0 ? (
            <Empty label="有効期限が近い物品はありません" />
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
                            onClick={() => resolveAlert(alert.id)}
                            className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-[#00b5ad] hover:text-[#00b5ad] active:scale-95"
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
        <Toast
          tone={toast.tone}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
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

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-10 text-center text-sm text-zinc-500">
      {label}
    </div>
  );
}

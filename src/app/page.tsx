"use client";

import * as api from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PecoHeader } from "@/components/peco";

type MenuCard = {
  href: string;
  title: string;
  description: string;
  emoji: string;
  badgeKey?: "alerts";
};

const MENU: MenuCard[] = [
  {
    href: "/inventory",
    title: "在庫一覧",
    description: "現在庫数・有効期限・発注点をまとめて確認",
    emoji: "📦",
  },
  {
    href: "/items/new",
    title: "物品登録",
    description: "新規物品をマスタに登録・QRコード発行",
    emoji: "🆕",
  },
  {
    href: "/stock-in",
    title: "入庫",
    description: "納品物品の入庫登録（ロット・期限）",
    emoji: "📥",
  },
  {
    href: "/stock-out",
    title: "出庫",
    description: "診療・処置で使用した物品を記録",
    emoji: "📤",
  },
  {
    href: "/transfer",
    title: "院間移動",
    description: "院間で物品を移動（送出・受取を同時記録）",
    emoji: "🔁",
  },
  {
    href: "/stocktake",
    title: "棚卸",
    description: "実在庫と帳簿在庫の差異を記録",
    emoji: "📋",
  },
  {
    href: "/alerts",
    title: "アラート",
    description: "発注点・有効期限の通知を確認",
    emoji: "🔔",
    badgeKey: "alerts",
  },
  {
    href: "/orders",
    title: "発注",
    description: "発注点を下回った物品の自動発注書",
    emoji: "🛒",
  },
  {
    href: "/reports",
    title: "レポート",
    description: "消費量・期限切れ・回転率・CSV出力",
    emoji: "📊",
  },
];

export default function Home() {
  const [unresolvedAlerts, setUnresolvedAlerts] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .countAlerts({ unresolved: true })
      .then((data) => {
        if (!cancelled) setUnresolvedAlerts(data.count);
      })
      .catch(() => {
        if (!cancelled) setUnresolvedAlerts(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-[--background]">
      <PecoHeader
        logoHref="/"
        logoSubtitle="在庫管理システム"
        showAlertBell={false}
        showUserMenu={false}
        rightSlot={
          <span className="hidden text-sm text-peco-text-secondary sm:inline">
            PECO Animal Hospital
          </span>
        }
      />

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-zinc-900">メニュー</h2>
          <p className="text-sm text-zinc-500 mt-1">
            iPad での操作に最適化されています。
          </p>
        </section>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MENU.map((card) => {
            const badgeCount =
              card.badgeKey === "alerts" ? unresolvedAlerts : null;
            const showBadge =
              badgeCount !== null && badgeCount !== undefined && badgeCount > 0;
            return (
              <li key={card.href}>
                <Link
                  href={card.href}
                  className="relative block min-h-[120px] rounded-2xl bg-white border border-zinc-200 p-5 transition hover:border-peco-secondary hover:shadow-md active:scale-[0.99]"
                >
                  {showBadge && (
                    <span className="absolute top-3 right-3 inline-flex min-w-[28px] h-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-semibold text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="text-3xl" aria-hidden>
                      {card.emoji}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">
                        {card.title}
                      </h3>
                      <p className="text-sm text-zinc-500 mt-1">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <section className="mt-12 border-t border-zinc-200 pt-8">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            他システム
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-peco-secondary min-h-[64px]"
            >
              <div>
                <div className="font-medium text-zinc-900">診断支援</div>
                <div className="text-xs text-zinc-500">
                  Diagnosis Assistant
                </div>
              </div>
              <span className="text-zinc-400" aria-hidden>
                →
              </span>
            </a>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-peco-secondary min-h-[64px]"
            >
              <div>
                <div className="font-medium text-zinc-900">SFA</div>
                <div className="text-xs text-zinc-500">Sales Force</div>
              </div>
              <span className="text-zinc-400" aria-hidden>
                →
              </span>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-zinc-500 flex justify-between">
          <span>© PECO Animal Hospital</span>
          <span>v0.3 · Phase 2</span>
        </div>
      </footer>
    </div>
  );
}

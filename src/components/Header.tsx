"use client";

import * as api from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

type HeaderProps = {
  title: string;
  showBack?: boolean;
  showAlertBadge?: boolean;
};

export function Header({
  title,
  showBack = true,
  showAlertBadge = false,
}: HeaderProps) {
  const [unresolved, setUnresolved] = useState<number | null>(null);

  useEffect(() => {
    if (!showAlertBadge) return;
    let cancelled = false;
    api
      .countAlerts({ unresolved: true })
      .then((data) => {
        if (!cancelled) setUnresolved(data.count);
      })
      .catch(() => {
        if (!cancelled) setUnresolved(0);
      });
    return () => {
      cancelled = true;
    };
  }, [showAlertBadge]);

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-4">
        {showBack && (
          <Link
            href="/"
            aria-label="ホームへ戻る"
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 active:scale-95"
          >
            <span aria-hidden className="text-2xl">
              ‹
            </span>
          </Link>
        )}
        <Link href="/" className="flex items-center gap-2 min-h-[48px]">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#00b5ad] text-white text-base font-bold"
          >
            P
          </span>
          <span className="hidden sm:inline text-lg font-bold text-[#00b5ad]">
            PecoStock
          </span>
        </Link>
        <h1 className="ml-auto text-base sm:text-lg font-semibold text-zinc-900">
          {title}
        </h1>
        {showAlertBadge && (
          <Link
            href="/alerts"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:border-[#00b5ad] active:scale-95"
            aria-label="アラート"
          >
            <span aria-hidden className="text-xl">
              🔔
            </span>
            {unresolved !== null && unresolved > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                {unresolved > 99 ? "99+" : unresolved}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}

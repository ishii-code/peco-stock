"use client";

import * as api from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PecoLogo } from "@/components/peco";

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
    <header className="bg-peco-bg border-b border-gray-200 sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-4">
        {showBack && (
          <Link
            href="/"
            aria-label="ホームへ戻る"
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-peco-text-primary hover:bg-peco-gray-100 active:scale-95"
          >
            <span aria-hidden className="text-2xl">
              ‹
            </span>
          </Link>
        )}
        <Link
          href="/"
          aria-label="PecoStock ホーム"
          className="inline-flex items-center min-h-[48px] rounded-md hover:opacity-80"
        >
          <PecoLogo size="md" color="primary" subtitle="PecoStock" />
        </Link>
        <h1 className="ml-auto text-base sm:text-lg font-semibold text-peco-text-primary">
          {title}
        </h1>
        {showAlertBadge && (
          <Link
            href="/alerts"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-peco-gray-300 bg-peco-bg hover:border-peco-secondary active:scale-95"
            aria-label="アラート"
          >
            <span aria-hidden className="text-xl">
              🔔
            </span>
            {unresolved !== null && unresolved > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-peco-danger px-1.5 text-xs font-semibold text-white">
                {unresolved > 99 ? "99+" : unresolved}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}

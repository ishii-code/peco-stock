import * as React from "react";
import Link from "next/link";
import { PecoLogo } from "./PecoLogo";

export interface PecoHeaderNavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface PecoHeaderProps {
  nav?: PecoHeaderNavItem[];
  alertCount?: number;
  userName?: string;
  userInitial?: string;
  rightSlot?: React.ReactNode;
  className?: string;
  logoSubtitle?: string;
  logoHref?: string;
  showAlertBell?: boolean;
  showUserMenu?: boolean;
}

function AlertBellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.17V11a6 6 0 10-12 0v3.17a2 2 0 01-.6 1.43L4 17h5m6 0a3 3 0 01-6 0"
      />
    </svg>
  );
}

export function PecoHeader({
  nav = [],
  alertCount = 0,
  userName,
  userInitial,
  rightSlot,
  className = "",
  logoSubtitle,
  logoHref,
  showAlertBell = true,
  showUserMenu = true,
}: PecoHeaderProps) {
  const initial =
    userInitial ?? (userName ? userName.trim().charAt(0).toUpperCase() : "U");

  const logo = <PecoLogo size="md" color="primary" subtitle={logoSubtitle} />;

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full",
        "bg-peco-bg text-peco-text-primary",
        "border-b border-gray-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4 md:px-6">
        {logoHref ? (
          <Link
            href={logoHref}
            aria-label="ホームへ"
            className="inline-flex items-center rounded-md hover:opacity-80"
          >
            {logo}
          </Link>
        ) : (
          logo
        )}

        {nav.length > 0 ? (
          <nav aria-label="メイン" className="hidden md:flex items-center gap-1">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={[
                  "inline-flex h-10 items-center rounded-md px-3 text-sm font-medium",
                  "transition-colors",
                  item.active
                    ? "bg-peco-primary text-peco-text-primary"
                    : "text-peco-text-primary hover:text-peco-secondary hover:bg-peco-primary-subtle",
                ].join(" ")}
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {rightSlot}
          {showAlertBell ? (
            <button
              type="button"
              aria-label={`通知 ${alertCount}件`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-peco-text-primary hover:bg-peco-gray-100 hover:text-peco-secondary"
            >
              <AlertBellIcon />
              {alertCount > 0 ? (
                <span
                  className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-peco-danger px-1 text-[10px] font-semibold leading-none text-white"
                  aria-hidden
                >
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              ) : null}
            </button>
          ) : null}
          {showUserMenu ? (
            <div
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-peco-primary text-sm font-semibold text-peco-text-primary"
              aria-label={userName ? `${userName} のアカウント` : "アカウント"}
              title={userName}
            >
              {initial}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default PecoHeader;

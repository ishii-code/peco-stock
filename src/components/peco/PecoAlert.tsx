"use client";

import * as React from "react";

export type PecoAlertVariant = "success" | "warning" | "danger" | "info";

export interface PecoAlertProps {
  variant?: PecoAlertVariant;
  title?: React.ReactNode;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const variantClasses: Record<
  PecoAlertVariant,
  { container: string; icon: string; title: string }
> = {
  success: {
    container: "bg-peco-success-light border-peco-success/30",
    icon: "text-peco-success",
    title: "text-peco-success",
  },
  warning: {
    container: "bg-peco-warning-light border-peco-warning/30",
    icon: "text-peco-warning",
    title: "text-peco-warning",
  },
  danger: {
    container: "bg-peco-danger-light border-peco-danger/30",
    icon: "text-peco-danger",
    title: "text-peco-danger",
  },
  info: {
    container: "bg-peco-info-light border-peco-info/30",
    icon: "text-peco-info",
    title: "text-peco-info",
  },
};

function AlertIcon({ variant }: { variant: PecoAlertVariant }) {
  const common = "h-5 w-5";
  if (variant === "success") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 003.84 21h16.32a2 2 0 001.73-2.96L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    );
  }
  if (variant === "danger") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
    </svg>
  );
}

export function PecoAlert({
  variant = "info",
  title,
  children,
  onClose,
  className = "",
}: PecoAlertProps) {
  const v = variantClasses[variant];
  return (
    <div
      role="alert"
      className={[
        "flex items-start gap-3 rounded-peco-md border p-4",
        v.container,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={`mt-0.5 shrink-0 ${v.icon}`}>
        <AlertIcon variant={variant} />
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <p className={`font-semibold ${v.title}`}>{title}</p>
        ) : null}
        {children ? (
          <div className="text-sm text-peco-gray-700 mt-1 leading-relaxed">
            {children}
          </div>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="shrink-0 rounded p-1 text-peco-gray-500 hover:text-peco-gray-700 hover:bg-black/5"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export default PecoAlert;

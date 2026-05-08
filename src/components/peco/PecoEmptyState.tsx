import * as React from "react";

export interface PecoEmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

function DefaultIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-10 w-10"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7h18M5 7v12a2 2 0 002 2h10a2 2 0 002-2V7M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"
      />
    </svg>
  );
}

export function PecoEmptyState({
  icon,
  title,
  subtitle,
  action,
  className = "",
}: PecoEmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center px-6 py-12",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-peco-primary-subtle text-peco-primary mb-4">
        {icon ?? <DefaultIcon />}
      </div>
      <h3 className="text-lg font-semibold text-peco-gray-900">{title}</h3>
      {subtitle ? (
        <p className="mt-2 max-w-md text-sm text-peco-gray-500">{subtitle}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export default PecoEmptyState;

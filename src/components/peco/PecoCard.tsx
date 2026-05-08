import * as React from "react";

export interface PecoCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  bordered?: boolean;
  hoverable?: boolean;
  noPadding?: boolean;
  headerAction?: React.ReactNode;
}

export function PecoCard({
  title,
  subtitle,
  footer,
  bordered = false,
  hoverable = false,
  noPadding = false,
  headerAction,
  className = "",
  children,
  ...rest
}: PecoCardProps) {
  const hasHeader = title || subtitle || headerAction;
  return (
    <div
      className={[
        "bg-white rounded-peco-lg shadow-peco-md",
        bordered ? "border border-peco-gray-300/60" : "",
        hoverable
          ? "transition-shadow hover:shadow-peco-lg cursor-pointer"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {hasHeader ? (
        <div
          className={[
            "flex items-start justify-between gap-4",
            noPadding ? "px-5 pt-5" : "px-5 pt-5",
            "pb-3 border-b border-peco-gray-100",
          ].join(" ")}
        >
          <div className="min-w-0">
            {title ? (
              <h3 className="text-lg font-semibold text-peco-gray-900 truncate">
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-sm text-peco-gray-500">{subtitle}</p>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      ) : null}

      <div className={noPadding ? "" : "p-5"}>{children}</div>

      {footer ? (
        <div className="border-t border-peco-gray-100 px-5 py-4 bg-peco-gray-50/60 rounded-b-peco-lg">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export default PecoCard;

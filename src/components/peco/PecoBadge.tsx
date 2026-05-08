import * as React from "react";

export type PecoBadgeVariant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export type PecoBadgeSize = "sm" | "md";

export interface PecoBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: PecoBadgeVariant;
  size?: PecoBadgeSize;
  icon?: React.ReactNode;
  dot?: boolean;
}

const variantClasses: Record<PecoBadgeVariant, string> = {
  primary: "bg-peco-primary text-peco-text-primary",
  success: "bg-peco-success-light text-peco-success",
  warning: "bg-peco-warning-light text-peco-warning",
  danger: "bg-peco-danger-light text-peco-danger",
  info: "bg-peco-info-light text-peco-info",
  neutral: "bg-peco-gray-100 text-peco-gray-700",
};

const dotClasses: Record<PecoBadgeVariant, string> = {
  primary: "bg-peco-text-primary",
  success: "bg-peco-success",
  warning: "bg-peco-warning",
  danger: "bg-peco-danger",
  info: "bg-peco-info",
  neutral: "bg-peco-gray-500",
};

const sizeClasses: Record<PecoBadgeSize, string> = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-2.5 py-1 gap-1.5",
};

export function PecoBadge({
  variant = "neutral",
  size = "sm",
  icon,
  dot = false,
  className = "",
  children,
  ...rest
}: PecoBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center font-medium rounded-full whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {dot ? (
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`}
        />
      ) : null}
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}

export default PecoBadge;

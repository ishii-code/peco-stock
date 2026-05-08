import * as React from "react";

export type PecoSpinnerSize = "sm" | "md" | "lg";
export type PecoSpinnerColor = "primary" | "white" | "gray";

export interface PecoSpinnerProps {
  size?: PecoSpinnerSize;
  color?: PecoSpinnerColor;
  className?: string;
  label?: string;
}

const sizeMap: Record<PecoSpinnerSize, { size: string; border: string }> = {
  sm: { size: "h-4 w-4", border: "border-2" },
  md: { size: "h-6 w-6", border: "border-2" },
  lg: { size: "h-10 w-10", border: "border-[3px]" },
};

const colorMap: Record<PecoSpinnerColor, string> = {
  primary: "border-peco-primary/20 border-t-peco-primary",
  white: "border-white/30 border-t-white",
  gray: "border-peco-gray-300 border-t-peco-gray-500",
};

export function PecoSpinner({
  size = "md",
  color = "primary",
  className = "",
  label = "読み込み中",
}: PecoSpinnerProps) {
  const s = sizeMap[size];
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block rounded-full peco-spin ${s.size} ${s.border} ${colorMap[color]} ${className}`}
    />
  );
}

export interface CenteredSpinnerProps extends PecoSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function CenteredSpinner({
  message,
  fullScreen = false,
  ...props
}: CenteredSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        fullScreen ? "min-h-screen" : "py-12"
      }`}
    >
      <PecoSpinner size="lg" {...props} />
      {message ? (
        <p className="text-sm text-peco-gray-500">{message}</p>
      ) : null}
    </div>
  );
}

export default PecoSpinner;

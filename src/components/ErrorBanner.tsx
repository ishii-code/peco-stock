type Props = {
  message: string;
  tone?: "error" | "warning" | "info";
  className?: string;
};

const TONE_CLASS: Record<NonNullable<Props["tone"]>, string> = {
  error: "border-peco-danger/30 bg-peco-danger-light text-peco-danger",
  warning: "border-peco-warning/30 bg-peco-warning-light text-peco-warning",
  info: "border-peco-info/30 bg-peco-info-light text-peco-info",
};

export function ErrorBanner({ message, tone = "error", className }: Props) {
  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm ${TONE_CLASS[tone]} ${className ?? ""}`}
    >
      {message}
    </div>
  );
}

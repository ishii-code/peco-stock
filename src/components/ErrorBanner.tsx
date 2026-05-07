type Props = {
  message: string;
  tone?: "error" | "warning" | "info";
  className?: string;
};

const TONE_CLASS: Record<NonNullable<Props["tone"]>, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-zinc-200 bg-zinc-50 text-zinc-700",
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

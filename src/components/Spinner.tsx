type Props = {
  label?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export function Spinner({ label, size = "md" }: Props) {
  return (
    <div
      className="flex items-center justify-center gap-3 text-zinc-500"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={`inline-block animate-spin rounded-full border-[#00b5ad] border-t-transparent ${SIZE_CLASS[size]}`}
      />
      {label && <span>{label}</span>}
    </div>
  );
}

// Convenience full-block loader.
export function CenteredSpinner({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner label={label} />
    </div>
  );
}

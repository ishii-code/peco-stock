type Props = {
  message: string;
  className?: string;
};

export function EmptyState({ message, className }: Props) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-peco-gray-300 bg-peco-bg py-10 text-center text-sm text-peco-text-muted ${className ?? ""}`}
    >
      {message}
    </div>
  );
}

type Props = {
  message: string;
  className?: string;
};

export function EmptyState({ message, className }: Props) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-zinc-300 bg-white py-10 text-center text-sm text-zinc-500 ${className ?? ""}`}
    >
      {message}
    </div>
  );
}

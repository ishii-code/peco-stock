"use client";

import { useEffect } from "react";

type Tone = "success" | "error" | "info";

type ToastProps = {
  tone?: Tone;
  message: string;
  onDismiss: () => void;
  durationMs?: number;
};

const TONE_STYLES: Record<Tone, string> = {
  success: "bg-peco-secondary text-white",
  error: "bg-red-600 text-white",
  info: "bg-zinc-800 text-white",
};

export function Toast({
  tone = "success",
  message,
  onDismiss,
  durationMs = 3000,
}: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-5 py-3 shadow-lg text-base font-medium ${TONE_STYLES[tone]}`}
    >
      {message}
    </div>
  );
}

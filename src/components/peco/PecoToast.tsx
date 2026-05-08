"use client";

import * as React from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};
const useIsHydrated = () =>
  React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

export type PecoToastVariant = "success" | "error" | "warning" | "info";
export type PecoToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

export interface PecoToastOptions {
  title?: string;
  message: string;
  variant?: PecoToastVariant;
  durationMs?: number;
}

interface ToastItem extends Required<Omit<PecoToastOptions, "title">> {
  id: number;
  title?: string;
}

interface ToastContextValue {
  toast: (options: PecoToastOptions) => number;
  success: (message: string, title?: string) => number;
  error: (message: string, title?: string) => number;
  warning: (message: string, title?: string) => number;
  info: (message: string, title?: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const positionClasses: Record<PecoToastPosition, string> = {
  "top-right": "top-4 right-4 items-end",
  "top-left": "top-4 left-4 items-start",
  "bottom-right": "bottom-4 right-4 items-end",
  "bottom-left": "bottom-4 left-4 items-start",
};

const variantClasses: Record<
  PecoToastVariant,
  { bar: string; icon: string; title: string }
> = {
  success: {
    bar: "bg-peco-success",
    icon: "text-peco-success",
    title: "text-peco-success",
  },
  error: {
    bar: "bg-peco-danger",
    icon: "text-peco-danger",
    title: "text-peco-danger",
  },
  warning: {
    bar: "bg-peco-warning",
    icon: "text-peco-warning",
    title: "text-peco-warning",
  },
  info: {
    bar: "bg-peco-info",
    icon: "text-peco-info",
    title: "text-peco-info",
  },
};

function ToastIcon({ variant }: { variant: PecoToastVariant }) {
  const c = "h-5 w-5";
  if (variant === "success")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  if (variant === "error")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
      </svg>
    );
  if (variant === "warning")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 003.84 21h16.32a2 2 0 001.73-2.96L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    );
  return (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
    </svg>
  );
}

export interface PecoToastProviderProps {
  children: React.ReactNode;
  position?: PecoToastPosition;
}

export function PecoToastProvider({
  children,
  position = "top-right",
}: PecoToastProviderProps) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const isHydrated = useIsHydrated();
  const idRef = React.useRef(0);
  const timersRef = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = React.useCallback(
    (options: PecoToastOptions) => {
      idRef.current += 1;
      const id = idRef.current;
      const item: ToastItem = {
        id,
        title: options.title,
        message: options.message,
        variant: options.variant ?? "info",
        durationMs: options.durationMs ?? 4000,
      };
      setItems((prev) => [...prev, item]);
      if (item.durationMs > 0) {
        const t = setTimeout(() => dismiss(id), item.durationMs);
        timersRef.current.set(id, t);
      }
      return id;
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (message, title) =>
        toast({ message, title, variant: "success" }),
      error: (message, title) => toast({ message, title, variant: "error" }),
      warning: (message, title) =>
        toast({ message, title, variant: "warning" }),
      info: (message, title) => toast({ message, title, variant: "info" }),
    }),
    [toast, dismiss],
  );

  const portal = isHydrated
    ? createPortal(
        <div
          aria-live="polite"
          aria-atomic="true"
          className={`pointer-events-none fixed z-[200] flex flex-col gap-3 ${positionClasses[position]}`}
        >
          {items.map((t) => {
            const v = variantClasses[t.variant];
            return (
              <div
                key={t.id}
                role="status"
                className="pointer-events-auto peco-toast-in flex w-[min(92vw,360px)] overflow-hidden rounded-peco-md bg-white shadow-peco-lg border border-peco-gray-100"
              >
                <span aria-hidden className={`w-1 shrink-0 ${v.bar}`} />
                <div className="flex flex-1 items-start gap-3 p-4">
                  <span className={`mt-0.5 shrink-0 ${v.icon}`}>
                    <ToastIcon variant={t.variant} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {t.title ? (
                      <p className={`text-sm font-semibold ${v.title}`}>
                        {t.title}
                      </p>
                    ) : null}
                    <p className="text-sm text-peco-gray-700 leading-relaxed">
                      {t.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="閉じる"
                    className="shrink-0 rounded p-1 text-peco-gray-500 hover:text-peco-gray-700 hover:bg-peco-gray-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portal}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast は <PecoToastProvider> 内で呼び出してください");
  }
  return ctx;
}

export default PecoToastProvider;

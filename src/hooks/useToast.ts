"use client";

import { useCallback, useState } from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastState = {
  tone: ToastTone;
  message: string;
} | null;

export type UseToastResult = {
  toast: ToastState;
  show: (tone: ToastTone, message: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  dismiss: () => void;
};

export function useToast(): UseToastResult {
  const [toast, setToast] = useState<ToastState>(null);

  const show = useCallback((tone: ToastTone, message: string) => {
    setToast({ tone, message });
  }, []);
  const showSuccess = useCallback(
    (message: string) => setToast({ tone: "success", message }),
    [],
  );
  const showError = useCallback(
    (message: string) => setToast({ tone: "error", message }),
    [],
  );
  const showInfo = useCallback(
    (message: string) => setToast({ tone: "info", message }),
    [],
  );
  const dismiss = useCallback(() => setToast(null), []);

  return { toast, show, showSuccess, showError, showInfo, dismiss };
}

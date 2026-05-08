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

export type PecoModalSize = "sm" | "md" | "lg" | "xl";

export interface PecoModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: PecoModalSize;
  closeOnOverlayClick?: boolean;
  hideCloseButton?: boolean;
  children?: React.ReactNode;
}

const sizeClasses: Record<PecoModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function PecoModal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  hideCloseButton = false,
  children,
}: PecoModalProps) {
  const isHydrated = useIsHydrated();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!isHydrated || !open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 peco-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
    >
      <div
        className="absolute inset-0 bg-black/80"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden
      />
      <div
        className={[
          "relative w-full bg-white rounded-peco-xl shadow-peco-lg",
          "flex flex-col max-h-[90vh] peco-modal-in",
          sizeClasses[size],
        ].join(" ")}
      >
        {(title || !hideCloseButton) ? (
          <div className="flex items-start justify-between gap-4 border-b border-peco-gray-100 px-6 py-4">
            <div className="min-w-0">
              {title ? (
                <h2 className="text-lg font-semibold text-peco-gray-900">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-peco-gray-500">{description}</p>
              ) : null}
            </div>
            {!hideCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="shrink-0 rounded-md p-2 text-peco-gray-500 hover:text-peco-gray-700 hover:bg-peco-gray-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <div className="border-t border-peco-gray-100 px-6 py-4 bg-peco-gray-50/60 rounded-b-peco-xl">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

export default PecoModal;

"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

type Props = {
  onScan: (result: string) => void;
  onClose: () => void;
};

export function QrScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `cancelled` is true once this effect has been cleaned up. Because
    // `scanner.start()` is async, a StrictMode double-mount or a fast
    // unmount can fire cleanup before start has resolved — at which point
    // `scanner.isScanning` is still false and we'd skip `stop()`. The
    // start callback then attaches a <video> to a scanner that nobody
    // owns, producing a second camera preview. The fix: make the
    // resolution of start() responsible for stopping when cleanup ran first.
    let cancelled = false;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (result) => {
          if (cancelled) return;
          onScan(result);
          handleClose();
        },
        () => {},
      )
      .then(() => {
        if (cancelled) {
          // Effect was already cleaned up while start was in-flight.
          // Now that the camera is actually running, tear it down.
          scanner.stop().catch(() => {});
          return;
        }
        setIsRunning(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError("カメラを起動できませんでした: " + message);
      });

    return () => {
      cancelled = true;
      if (scanner.isScanning) {
        // Already-running case: stop now.
        scanner.stop().catch(() => {});
      }
      // Not-yet-started case: the .then handler above will see `cancelled`
      // and stop once start() resolves.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      scanner
        .stop()
        .then(() => onClose())
        .catch(() => onClose());
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center">
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: "#00B5AD" }}>
            QRスキャン
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 text-2xl"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        {error ? (
          <div className="text-red-500 text-sm p-4 text-center">{error}</div>
        ) : (
          <div id="qr-reader" className="w-full rounded-xl overflow-hidden" />
        )}
        {!isRunning && !error && (
          <p className="text-center text-gray-400 text-sm mt-2">
            カメラを起動中...
          </p>
        )}
      </div>
    </div>
  );
}

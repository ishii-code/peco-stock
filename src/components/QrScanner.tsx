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
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (result) => {
          onScan(result);
          handleClose();
        },
        () => {},
      )
      .then(() => setIsRunning(true))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError("カメラを起動できませんでした: " + message);
      });

    return () => {
      // アンマウント時は isRunning フラグに関係なく
      // scanner.isScanning で確認してから止める
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
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

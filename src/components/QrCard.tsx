"use client";

import { QRCodeSVG } from "qrcode.react";

type Props = {
  value: string;
  label?: string;
};

export function QrCard({ value, label }: Props) {
  function handlePrint() {
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>QR ${label ?? ""}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 24px; }
        h1 { font-size: 18px; margin: 8px 0 16px; }
        code { font-size: 11px; color: #555; word-break: break-all; }
      </style></head><body>
      <h1>${label ?? "QRコード"}</h1>
      <div id="qr"></div>
      <p><code>${value}</code></p>
      </body></html>`);
    const container = win.document.getElementById("qr");
    if (container) {
      const svg = document.querySelector(`[data-qr-print="${value}"]`);
      if (svg) container.innerHTML = svg.outerHTML;
    }
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 100);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 inline-flex flex-col items-center gap-3">
      <QRCodeSVG
        value={value}
        size={180}
        level="M"
        data-qr-print={value}
      />
      {label && <div className="text-sm font-medium text-zinc-700">{label}</div>}
      <code className="text-[11px] text-zinc-500 break-all max-w-[180px] text-center">
        {value}
      </code>
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex h-12 items-center justify-center rounded-xl border border-peco-secondary bg-white px-5 text-sm font-medium text-peco-secondary hover:bg-peco-secondary-light active:scale-95"
      >
        印刷
      </button>
    </div>
  );
}

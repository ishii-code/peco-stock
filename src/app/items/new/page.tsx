"use client";

import { Header } from "@/components/Header";
import { QrCard } from "@/components/QrCard";
import { Toast } from "@/components/Toast";
import { DEFAULT_CLINIC_ID } from "@/lib/clinic";
import Link from "next/link";
import { useState } from "react";

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

type CreatedItem = {
  id: string;
  name: string;
  qrCode: string | null;
};

const CATEGORIES = [
  { value: "medical", label: "医薬品" },
  { value: "consumable", label: "消耗品" },
  { value: "reagent", label: "試薬" },
];

const UNITS = ["錠", "mL", "本", "枚", "袋", "個"];

const STORAGE_TEMPS = [
  { value: "normal", label: "常温" },
  { value: "refrigerated", label: "冷蔵" },
  { value: "frozen", label: "冷凍" },
];

const ANIMAL_TYPES = [
  { value: "dog", label: "犬" },
  { value: "cat", label: "猫" },
  { value: "both", label: "両方" },
];

export default function NewItemPage() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("medical");
  const [unit, setUnit] = useState("錠");
  const [price, setPrice] = useState("");
  const [yjCode, setYjCode] = useState("");
  const [janCode, setJanCode] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [minStock, setMinStock] = useState("");
  const [storageTemp, setStorageTemp] = useState("normal");
  const [animalType, setAnimalType] = useState("both");
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [toxicClass, setToxicClass] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [created, setCreated] = useState<CreatedItem | null>(null);

  const reorderNum = Number(reorderPoint);
  const minStockNum = Number(minStock);
  const canSubmit =
    name.trim() !== "" &&
    unit.trim() !== "" &&
    Number.isFinite(reorderNum) &&
    reorderNum >= 0 &&
    Number.isFinite(minStockNum) &&
    minStockNum >= 0 &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const priceNum = price.trim() === "" ? null : Number(price);
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          unit,
          clinicId: DEFAULT_CLINIC_ID,
          price: typeof priceNum === "number" && Number.isFinite(priceNum) ? priceNum : null,
          yjCode: category === "medical" && yjCode.trim() ? yjCode.trim() : null,
          janCode: janCode.trim() || null,
          reorderPoint: reorderNum,
          minStock: minStockNum,
          storageTemp,
          animalType,
          requiresPrescription,
          toxicClass: toxicClass.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { item: CreatedItem };
      setCreated(data.item);
      setToast({ tone: "success", message: `${data.item.name} を登録しました` });
    } catch (err) {
      setToast({
        tone: "error",
        message: err instanceof Error ? err.message : "登録に失敗しました",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="flex flex-1 flex-col">
        <Header title="物品登録 完了" />
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            「{created.name}」を登録しました。QRコードを印刷して物品に貼付してください。
          </div>
          <div className="flex flex-col items-center">
            {created.qrCode && (
              <QrCard value={created.qrCode} label={created.name} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setName("");
                setPrice("");
                setYjCode("");
                setJanCode("");
                setReorderPoint("");
                setMinStock("");
                setRequiresPrescription(false);
                setToxicClass("");
                setNotes("");
              }}
              className="h-14 rounded-xl border border-[#00b5ad] bg-white text-base font-semibold text-[#00b5ad] hover:bg-[#e6f7f6] active:scale-[0.99]"
            >
              続けて登録
            </button>
            <Link
              href={`/items/${created.id}`}
              className="h-14 rounded-xl bg-[#00b5ad] text-base font-semibold text-white hover:bg-[#008f88] active:scale-[0.99] flex items-center justify-center"
            >
              詳細を見る
            </Link>
          </div>
        </main>
        {toast && (
          <Toast
            tone={toast.tone}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="物品登録" showAlertBadge />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="品名" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: アモキシシリン"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="カテゴリ" required>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="単位" required>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="薬価">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="任意"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          {category === "medical" && (
            <Field label="YJコード">
              <input
                type="text"
                value={yjCode}
                onChange={(e) => setYjCode(e.target.value)}
                placeholder="任意"
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
              />
            </Field>
          )}

          <Field label="JANコード">
            <input
              type="text"
              value={janCode}
              onChange={(e) => setJanCode(e.target.value)}
              placeholder="任意"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="発注点" required>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                placeholder="例: 20"
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
              />
            </Field>
            <Field label="最小在庫数" required>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="例: 10"
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
              />
            </Field>
          </div>

          <Field label="保管温度">
            <div className="grid grid-cols-3 gap-2">
              {STORAGE_TEMPS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStorageTemp(opt.value)}
                  className={`h-12 rounded-xl border px-4 text-base font-medium transition active:scale-95 ${
                    storageTemp === opt.value
                      ? "border-[#00b5ad] bg-[#e6f7f6] text-[#00b5ad]"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-[#00b5ad]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="適応動物種">
            <div className="grid grid-cols-3 gap-2">
              {ANIMAL_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnimalType(opt.value)}
                  className={`h-12 rounded-xl border px-4 text-base font-medium transition active:scale-95 ${
                    animalType === opt.value
                      ? "border-[#00b5ad] bg-[#e6f7f6] text-[#00b5ad]"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-[#00b5ad]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <label className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 min-h-[56px]">
            <span className="text-base font-medium text-zinc-700">処方箋要</span>
            <button
              type="button"
              role="switch"
              aria-checked={requiresPrescription}
              onClick={() => setRequiresPrescription((v) => !v)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                requiresPrescription ? "bg-[#00b5ad]" : "bg-zinc-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  requiresPrescription ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          <Field label="毒劇薬区分">
            <input
              type="text"
              value={toxicClass}
              onChange={(e) => setToxicClass(e.target.value)}
              placeholder="例: 劇薬 / 毒薬 / 麻薬 (任意)"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <Field label="メモ">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="任意"
              className="min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base focus:border-[#00b5ad] focus:outline-none focus:ring-2 focus:ring-[#00b5ad]/20"
            />
          </Field>

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-14 w-full rounded-xl bg-[#00b5ad] text-base font-semibold text-white shadow-sm hover:bg-[#008f88] active:scale-[0.99] disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            {submitting ? "登録中..." : "登録する"}
          </button>
        </form>
      </main>
      {toast && (
        <Toast
          tone={toast.tone}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700 mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

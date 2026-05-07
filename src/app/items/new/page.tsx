"use client";

import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/Field";
import { Header } from "@/components/Header";
import { QrCard } from "@/components/QrCard";
import { Toast } from "@/components/Toast";
import {
  ANIMAL_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  STORAGE_TEMP_OPTIONS,
  UNIT_OPTIONS,
  type AnimalType,
  type ItemCategory,
  type StorageTemp,
} from "@/constants";
import { useClinic } from "@/hooks/useClinic";
import { useToast } from "@/hooks/useToast";
import * as api from "@/lib/api";
import type { Item } from "@/types";
import Link from "next/link";
import { useState } from "react";

const UNIT_OPTIONS_TYPED = UNIT_OPTIONS.map((u) => ({ value: u, label: u }));

export default function NewItemPage() {
  const { clinicId } = useClinic();
  const { toast, showSuccess, showError, dismiss } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemCategory>("medical");
  const [unit, setUnit] = useState<string>("錠");
  const [price, setPrice] = useState("");
  const [yjCode, setYjCode] = useState("");
  const [janCode, setJanCode] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [minStock, setMinStock] = useState("");
  const [storageTemp, setStorageTemp] = useState<StorageTemp>("normal");
  const [animalType, setAnimalType] = useState<AnimalType>("both");
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [toxicClass, setToxicClass] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Item | null>(null);

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
      const data = await api.createItem({
        name: name.trim(),
        category,
        unit,
        clinicId,
        price:
          typeof priceNum === "number" && Number.isFinite(priceNum)
            ? priceNum
            : null,
        yjCode: category === "medical" && yjCode.trim() ? yjCode.trim() : null,
        janCode: janCode.trim() || null,
        reorderPoint: reorderNum,
        minStock: minStockNum,
        storageTemp,
        animalType,
        requiresPrescription,
        toxicClass: toxicClass.trim() || null,
        notes: notes.trim() || null,
      });
      setCreated(data.item);
      showSuccess(`${data.item.name} を登録しました`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "登録に失敗しました");
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
            <QrCard value={created.id} label={created.name} />
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
            onDismiss={dismiss}
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
          <TextField
            label="品名"
            required
            value={name}
            onChange={setName}
            placeholder="例: アモキシシリン"
          />

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="カテゴリ"
              required
              value={category}
              onChange={setCategory}
              options={CATEGORY_OPTIONS}
            />
            <SelectField
              label="単位"
              required
              value={unit}
              onChange={setUnit}
              options={UNIT_OPTIONS_TYPED}
            />
          </div>

          <TextField
            label="薬価"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={price}
            onChange={setPrice}
            placeholder="任意"
          />

          {category === "medical" && (
            <TextField
              label="YJコード"
              value={yjCode}
              onChange={setYjCode}
              placeholder="任意"
            />
          )}

          <TextField
            label="JANコード"
            value={janCode}
            onChange={setJanCode}
            placeholder="任意"
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="発注点"
              required
              type="number"
              inputMode="numeric"
              min={0}
              value={reorderPoint}
              onChange={setReorderPoint}
              placeholder="例: 20"
            />
            <TextField
              label="最小在庫数"
              required
              type="number"
              inputMode="numeric"
              min={0}
              value={minStock}
              onChange={setMinStock}
              placeholder="例: 10"
            />
          </div>

          <ButtonGroupField
            label="保管温度"
            value={storageTemp}
            onChange={setStorageTemp}
            options={STORAGE_TEMP_OPTIONS}
          />
          <ButtonGroupField
            label="適応動物種"
            value={animalType}
            onChange={setAnimalType}
            options={ANIMAL_TYPE_OPTIONS}
          />

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

          <TextField
            label="毒劇薬区分"
            value={toxicClass}
            onChange={setToxicClass}
            placeholder="例: 劇薬 / 毒薬 / 麻薬 (任意)"
          />

          <TextAreaField
            label="メモ"
            value={notes}
            onChange={setNotes}
            placeholder="任意"
          />

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
        <Toast tone={toast.tone} message={toast.message} onDismiss={dismiss} />
      )}
    </div>
  );
}

function ButtonGroupField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <div className="block">
      <span className="block text-sm font-medium text-zinc-700 mb-2">{label}</span>
      <div
        className={`grid gap-2 ${options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`h-12 rounded-xl border px-4 text-base font-medium transition active:scale-95 ${
              value === opt.value
                ? "border-[#00b5ad] bg-[#e6f7f6] text-[#00b5ad]"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-[#00b5ad]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

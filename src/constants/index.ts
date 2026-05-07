// Single source of truth for the lookup tables and limits used across the app.
// Pure data — safe to import from both server and client modules.
export {
  MAX_PRICE,
  MAX_QUANTITY,
  MAX_STOCK_LEVEL,
} from "@/lib/validation";

export const PECO_PRIMARY = "#00b5ad";
export const PECO_PRIMARY_DARK = "#008f88";
export const PECO_PRIMARY_SOFT = "#e6f7f6";

export type ItemCategory = "medical" | "consumable" | "reagent";
export type StorageTemp = "normal" | "refrigerated" | "frozen";
export type AnimalType = "dog" | "cat" | "both";
export type TransactionType = "in" | "out" | "move" | "discard" | "adjust";
export type OrderStatus = "draft" | "sent" | "received";
export type AlertType = "reorder" | "expiry";

type Option<T extends string> = { value: T; label: string };

export const CATEGORY_OPTIONS: Array<Option<ItemCategory>> = [
  { value: "medical", label: "医薬品" },
  { value: "consumable", label: "消耗品" },
  { value: "reagent", label: "試薬" },
];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
);

export const UNIT_OPTIONS = ["錠", "mL", "本", "枚", "袋", "個"] as const;

export const STORAGE_TEMP_OPTIONS: Array<Option<StorageTemp>> = [
  { value: "normal", label: "常温" },
  { value: "refrigerated", label: "冷蔵" },
  { value: "frozen", label: "冷凍" },
];

export const STORAGE_TEMP_LABEL: Record<string, string> = Object.fromEntries(
  STORAGE_TEMP_OPTIONS.map((s) => [s.value, s.label]),
);

export const ANIMAL_TYPE_OPTIONS: Array<Option<AnimalType>> = [
  { value: "dog", label: "犬" },
  { value: "cat", label: "猫" },
  { value: "both", label: "両方" },
];

export const ANIMAL_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ANIMAL_TYPE_OPTIONS.map((a) => [a.value, a.label]),
);

export const TX_TYPE_LABEL: Record<TransactionType, string> = {
  in: "入庫",
  out: "出庫",
  move: "移動",
  discard: "廃棄",
  adjust: "調整",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "下書き",
  sent: "送信済",
  received: "受領済",
};

export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  sent: "bg-amber-100 text-amber-800",
  received: "bg-emerald-100 text-emerald-700",
};

export const EXPIRY_WINDOW_DAYS = 30;
export const DAY_MS = 24 * 60 * 60 * 1000;

// Hard upper bounds for quantities and counts. Higher than any realistic
// veterinary clinic transaction would need, but small enough to keep the
// numbers in safe-integer / financial-arithmetic territory.
export const MAX_QUANTITY = 1_000_000;
export const MAX_PRICE = 100_000_000;
export const MAX_STOCK_LEVEL = 1_000_000;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function parseQuantity(
  value: unknown,
  field = "quantity",
  opts: { positive?: boolean; max?: number } = {},
): ParseResult<number> {
  if (!isFiniteNumber(value)) {
    return { ok: false, error: `${field} must be a finite number` };
  }
  const max = opts.max ?? MAX_QUANTITY;
  if (opts.positive && value <= 0) {
    return { ok: false, error: `${field} must be greater than 0` };
  }
  if (!opts.positive && value < 0) {
    return { ok: false, error: `${field} must be 0 or greater` };
  }
  if (value > max) {
    return { ok: false, error: `${field} must be at most ${max}` };
  }
  return { ok: true, value };
}

export function parseStockLevel(
  value: unknown,
  field: string,
): ParseResult<number> {
  if (!isFiniteNumber(value)) {
    return { ok: false, error: `${field} must be a finite number` };
  }
  if (!Number.isInteger(value)) {
    return { ok: false, error: `${field} must be an integer` };
  }
  if (value < 0 || value > MAX_STOCK_LEVEL) {
    return {
      ok: false,
      error: `${field} must be between 0 and ${MAX_STOCK_LEVEL}`,
    };
  }
  return { ok: true, value };
}

export function parsePrice(
  value: unknown,
  field = "price",
): ParseResult<number | null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (!isFiniteNumber(value)) {
    return { ok: false, error: `${field} must be a finite number or null` };
  }
  if (value < 0 || value > MAX_PRICE) {
    return { ok: false, error: `${field} must be between 0 and ${MAX_PRICE}` };
  }
  return { ok: true, value };
}

export function parseDateOrNull(
  value: unknown,
  field: string,
): ParseResult<Date | null> {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be an ISO date string` };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: `${field} is not a valid date` };
  }
  // Reject dates more than 50 years in the past or future as obvious typos.
  const fifty = 50 * 365 * 24 * 60 * 60 * 1000;
  const skew = Math.abs(d.getTime() - Date.now());
  if (skew > fifty) {
    return { ok: false, error: `${field} is out of acceptable range` };
  }
  return { ok: true, value: d };
}

export function parseRequiredString(
  value: unknown,
  field: string,
  maxLen = 1000,
): ParseResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: `${field} is required` };
  }
  const trimmed = value.trim();
  if (trimmed === "") return { ok: false, error: `${field} is required` };
  if (trimmed.length > maxLen) {
    return { ok: false, error: `${field} exceeds ${maxLen} characters` };
  }
  return { ok: true, value: trimmed };
}

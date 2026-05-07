import type {
  Alert,
  AlertCheckResult,
  AlertWithDetails,
  Clinic,
  CompleteStocktakeInput,
  ConsumptionPoint,
  CreateItemInput,
  CreateOrderInput,
  CreateTransactionInput,
  ExpiryReport,
  InventoryValueReport,
  InventoryWithItem,
  Item,
  ItemWithInventory,
  ItemWithStock,
  OrderWithItems,
  Stocktake,
  StocktakeWithEntries,
  TransactionWithItem,
  TransferInput,
  TurnoverRow,
  UpdateItemInput,
} from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(data.error ?? `HTTP ${res.status}`, res.status);
  }
  // 204 / empty body
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

// ---- Items ------------------------------------------------------------

export function listItems(params: {
  clinicId?: string;
  category?: string;
  search?: string;
}): Promise<{ items: ItemWithStock[] }> {
  return apiFetch(`/api/items${buildQuery(params)}`);
}

export function getItem(id: string): Promise<{ item: ItemWithInventory }> {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`);
}

export function createItem(body: CreateItemInput): Promise<{ item: Item }> {
  return apiFetch(`/api/items`, { method: "POST", body: JSON.stringify(body) });
}

export function updateItem(
  id: string,
  body: UpdateItemInput,
): Promise<{ item: Item }> {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteItem(id: string): Promise<{ ok: true }> {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---- Inventory --------------------------------------------------------

export function listInventory(params: {
  clinicId?: string;
  itemId?: string;
  sortByExpiry?: boolean;
}): Promise<{ inventory: InventoryWithItem[] }> {
  return apiFetch(
    `/api/inventory${buildQuery({
      clinicId: params.clinicId,
      itemId: params.itemId,
      sortByExpiry: params.sortByExpiry ? 1 : undefined,
    })}`,
  );
}

// ---- Transactions -----------------------------------------------------

export function listTransactions(params: {
  clinicId?: string;
  itemId?: string;
  type?: string;
}): Promise<{ transactions: TransactionWithItem[] }> {
  return apiFetch(`/api/transactions${buildQuery(params)}`);
}

export function createTransaction(
  body: CreateTransactionInput,
): Promise<{ transaction: TransactionWithItem }> {
  return apiFetch(`/api/transactions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---- Stocktakes -------------------------------------------------------

export function listStocktakes(params: {
  clinicId?: string;
}): Promise<{ stocktakes: Array<Stocktake & { _count: { entries: number } }> }> {
  return apiFetch(`/api/stocktakes${buildQuery(params)}`);
}

export function startStocktake(body: {
  clinicId: string;
  note?: string | null;
}): Promise<{ stocktake: Stocktake }> {
  return apiFetch(`/api/stocktakes`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function completeStocktake(
  id: string,
  body: CompleteStocktakeInput,
): Promise<{ stocktake: StocktakeWithEntries }> {
  return apiFetch(`/api/stocktakes/${encodeURIComponent(id)}/complete`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ---- Alerts -----------------------------------------------------------

export function listAlerts(params: {
  clinicId?: string;
  type?: string;
  unresolved?: boolean;
}): Promise<{ alerts: AlertWithDetails[] }> {
  return apiFetch(
    `/api/alerts${buildQuery({
      clinicId: params.clinicId,
      type: params.type,
      unresolved: params.unresolved ? 1 : undefined,
    })}`,
  );
}

export function countAlerts(params: {
  clinicId?: string;
  unresolved?: boolean;
}): Promise<{ count: number }> {
  return apiFetch(
    `/api/alerts${buildQuery({
      clinicId: params.clinicId,
      unresolved: params.unresolved ? 1 : undefined,
      count: 1,
    })}`,
  );
}

export function runAlertCheck(body: {
  clinicId?: string;
}): Promise<AlertCheckResult> {
  return apiFetch(`/api/alerts/check`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function resolveAlert(id: string): Promise<{ alert: Alert }> {
  return apiFetch(`/api/alerts/${encodeURIComponent(id)}/resolve`, {
    method: "PUT",
  });
}

// ---- Orders -----------------------------------------------------------

export function listOrders(params: {
  clinicId?: string;
  status?: string;
}): Promise<{ orders: OrderWithItems[] }> {
  return apiFetch(`/api/orders${buildQuery(params)}`);
}

export function createOrder(
  body: CreateOrderInput,
): Promise<{ order: OrderWithItems }> {
  return apiFetch(`/api/orders`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function sendOrder(
  id: string,
  body: { supplierEmail?: string },
): Promise<{
  order: OrderWithItems;
  email: { ok: boolean; skipped?: boolean; reason?: string };
}> {
  return apiFetch(`/api/orders/${encodeURIComponent(id)}/send`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function receiveOrder(
  id: string,
): Promise<{ order: OrderWithItems }> {
  return apiFetch(`/api/orders/${encodeURIComponent(id)}/receive`, {
    method: "PUT",
  });
}

// ---- Transfer ---------------------------------------------------------

export function listTransfers(params: {
  clinicId?: string;
}): Promise<{ transfers: TransactionWithItem[] }> {
  return apiFetch(`/api/transfer${buildQuery(params)}`);
}

export function createTransfer(
  body: TransferInput,
): Promise<{ transfers: Array<{ outId: string; inId: string }> }> {
  return apiFetch(`/api/transfer`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---- Clinics ----------------------------------------------------------

export function listClinics(): Promise<{ clinics: Clinic[] }> {
  return apiFetch(`/api/clinics`);
}

// ---- Reports ----------------------------------------------------------

export function reportConsumption(params: {
  clinicId?: string;
  itemId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ series: ConsumptionPoint[] }> {
  return apiFetch(`/api/reports/consumption${buildQuery(params)}`);
}

export function reportInventoryValue(params: {
  clinicId?: string;
}): Promise<InventoryValueReport> {
  return apiFetch(`/api/reports/inventory-value${buildQuery(params)}`);
}

export function reportExpiry(params: {
  clinicId?: string;
}): Promise<ExpiryReport> {
  return apiFetch(`/api/reports/expiry${buildQuery(params)}`);
}

export function reportTurnover(params: {
  clinicId?: string;
  periodDays?: number;
}): Promise<{ ranking: TurnoverRow[]; periodDays: number }> {
  return apiFetch(`/api/reports/turnover${buildQuery(params)}`);
}

// ---- Exports (URL builders, not fetches) ------------------------------

export function exportInventoryUrl(params: {
  clinicId: string;
}): string {
  return `/api/exports/inventory${buildQuery(params)}`;
}

export function exportTransactionsUrl(params: {
  clinicId: string;
  startDate?: string;
  endDate?: string;
}): string {
  return `/api/exports/transactions${buildQuery(params)}`;
}

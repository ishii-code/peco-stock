// Plain JSON-friendly shapes returned by the API. Dates arrive as ISO strings
// over the wire — server modules that work with `Date` should import from
// `@/generated/prisma/client` instead.
import type {
  AlertType,
  AnimalType,
  ItemCategory,
  OrderStatus,
  StorageTemp,
  TransactionType,
} from "@/constants";

export type Item = {
  id: string;
  name: string;
  category: ItemCategory | string;
  unit: string;
  price: number | null;
  yjCode: string | null;
  janCode: string | null;
  minStock: number;
  reorderPoint: number;
  storageTemp: StorageTemp | string;
  animalType: AnimalType | string;
  requiresPrescription: boolean;
  toxicClass: string | null;
  qrCode: string | null;
  imageUrl: string | null;
  notes: string | null;
  clinicId: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemWithStock = Item & {
  totalQuantity: number;
  nearestExpiry: string | null;
};

export type ItemWithInventory = Item & {
  inventory: Inventory[];
};

export type Inventory = {
  id: string;
  itemId: string;
  clinicId: string;
  quantity: number;
  lotNumber: string | null;
  expiryDate: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryWithItem = Inventory & {
  item: Pick<Item, "id" | "name" | "unit" | "category">;
};

export type Transaction = {
  id: string;
  itemId: string;
  clinicId: string;
  type: TransactionType | string;
  quantity: number;
  lotNumber: string | null;
  patientId: string | null;
  vetId: string | null;
  note: string | null;
  createdAt: string;
};

export type TransactionWithItem = Transaction & {
  item: Pick<Item, "id" | "name" | "unit"> & { category?: string };
};

export type Alert = {
  id: string;
  itemId: string;
  clinicId: string;
  type: AlertType | string;
  triggeredAt: string;
  resolvedAt: string | null;
  notifiedTo: string | null;
};

export type AlertWithDetails = Alert & {
  currentStock: number;
  nearestExpiry: string | null;
  item: {
    id: string;
    name: string;
    unit: string;
    category: string;
    reorderPoint: number;
  } | null;
};

export type Order = {
  id: string;
  clinicId: string;
  status: OrderStatus | string;
  supplierEmail: string | null;
  note: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  itemId: string;
  quantity: number;
  price: number | null;
  item: Pick<Item, "id" | "name" | "unit" | "category">;
};

export type OrderWithItems = Order & {
  items: OrderItem[];
};

export type Stocktake = {
  id: string;
  clinicId: string;
  startedAt: string;
  completedAt: string | null;
  note: string | null;
};

export type StocktakeEntry = {
  id: string;
  stocktakeId: string;
  itemId: string;
  expected: number;
  actual: number;
  diff: number;
  item: Pick<Item, "id" | "name" | "unit" | "category"> | null;
};

export type StocktakeWithEntries = Stocktake & {
  entries: StocktakeEntry[];
};

export type Clinic = { id: string };

// Report response shapes.
export type ConsumptionPoint = { date: string; quantity: number };

export type InventoryValueBreakdown = {
  category: string;
  quantity: number;
  value: number;
  itemCount: number;
};

export type InventoryValueReport = {
  breakdown: InventoryValueBreakdown[];
  total: number;
};

export type ExpiryRow = InventoryWithItem & { daysLeft: number };

export type ExpiryReport = {
  d30: ExpiryRow[];
  d60: ExpiryRow[];
  d90: ExpiryRow[];
};

export type TurnoverRow = {
  itemId: string;
  name: string;
  unit: string;
  category: string;
  consumed: number;
  stock: number;
  turnover: number;
};

export type AlertCheckResult = {
  created: { reorder: number; expiry: number };
};

// Form/input payload shapes.
export type CreateItemInput = {
  name: string;
  category: string;
  unit: string;
  clinicId: string;
  price?: number | null;
  yjCode?: string | null;
  janCode?: string | null;
  minStock?: number;
  reorderPoint?: number;
  storageTemp?: string;
  animalType?: string;
  requiresPrescription?: boolean;
  toxicClass?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
};

export type UpdateItemInput = Partial<Omit<CreateItemInput, "clinicId">>;

export type CreateTransactionInput = {
  itemId: string;
  clinicId: string;
  type: TransactionType;
  quantity: number;
  lotNumber?: string | null;
  expiryDate?: string | null;
  location?: string | null;
  patientId?: string | null;
  vetId?: string | null;
  note?: string | null;
};

export type CreateOrderInput = {
  clinicId: string;
  supplierEmail?: string | null;
  note?: string | null;
  items: Array<{ itemId: string; quantity: number; price?: number | null }>;
};

export type TransferInput = {
  fromClinicId: string;
  toClinicId: string;
  items: Array<{ itemId: string; quantity: number }>;
  note?: string | null;
};

export type CompleteStocktakeInput = {
  entries: Array<{ itemId: string; actual: number }>;
};

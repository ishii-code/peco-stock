import { prisma } from "@/lib/prisma";

export type ItemWithStock = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number | null;
  yjCode: string | null;
  janCode: string | null;
  minStock: number;
  reorderPoint: number;
  storageTemp: string;
  animalType: string;
  requiresPrescription: boolean;
  toxicClass: string | null;
  qrCode: string | null;
  imageUrl: string | null;
  notes: string | null;
  clinicId: string;
  createdAt: Date;
  updatedAt: Date;
  totalQuantity: number;
  nearestExpiry: Date | null;
};

type ListItemsArgs = {
  clinicId?: string;
  category?: string;
  search?: string;
};

export async function listItemsWithStock(
  args: ListItemsArgs,
): Promise<ItemWithStock[]> {
  const { clinicId, category, search } = args;
  const items = await prisma.item.findMany({
    where: {
      ...(clinicId ? { clinicId } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { yjCode: { contains: search, mode: "insensitive" as const } },
              { janCode: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: {
      inventory: {
        select: { quantity: true, expiryDate: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return items.map((item) => {
    const totalQuantity = item.inventory.reduce(
      (sum, inv) => sum + inv.quantity,
      0,
    );
    const upcomingExpiries = item.inventory
      .map((inv) => inv.expiryDate)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    const nearestExpiry = upcomingExpiries[0] ?? null;
    const { inventory: _inventory, ...rest } = item;
    return { ...rest, totalQuantity, nearestExpiry };
  });
}

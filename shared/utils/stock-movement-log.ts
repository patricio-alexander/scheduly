import type { PrismaClient, StockMovementType } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export async function recordStockMovement(
  tx: Tx,
  opts: {
    productId: number;
    quantity: number;
    type: StockMovementType;
    createdBy: number;
    description?: string | null;
    reason?: string | null;
    referenceType?: string | null;
    referenceId?: number | null;
    price?: number | null;
    date?: Date;
  },
) {
  if (opts.quantity <= 0) return null;
  return tx.stockMovement.create({
    data: {
      productId: opts.productId,
      quantity: opts.quantity,
      type: opts.type,
      createdBy: opts.createdBy,
      description: opts.description ?? null,
      reason: opts.reason ?? null,
      referenceType: opts.referenceType ?? null,
      referenceId: opts.referenceId ?? null,
      price: opts.price ?? null,
      date: opts.date ?? new Date(),
    },
  });
}

export async function recordStockMovements(
  tx: Tx,
  createdBy: number,
  type: StockMovementType,
  items: Array<{
    productId: number;
    quantity: number;
    price?: number | null;
  }>,
  meta: {
    description?: string;
    reason?: string;
    referenceType?: string;
    referenceId?: number;
    date?: Date;
  },
) {
  for (const item of items) {
    await recordStockMovement(tx, {
      productId: item.productId,
      quantity: item.quantity,
      type,
      createdBy,
      price: item.price,
      description: meta.description,
      reason: meta.reason,
      referenceType: meta.referenceType,
      referenceId: meta.referenceId,
      date: meta.date,
    });
  }
}

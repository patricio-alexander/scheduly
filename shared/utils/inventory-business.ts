import type { PrismaClient } from "@/generated/prisma/client";
import { incrementBranchStock, syncProductTotalStock } from "@/shared/utils/branch-stock";
import { lineTotal, toAmount } from "@/shared/utils/money";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export type PurchaseLineInput = {
  productId: number;
  quantity: number;
  unitCost: number;
};

export function parsePurchaseLines(lines: unknown): PurchaseLineInput[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("Agrega al menos un producto a la compra");
  }

  const merged = new Map<number, { quantity: number; unitCost: number }>();

  for (const item of lines) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = Number(row.productId);
    const quantity = Number(row.quantity ?? 1);
    const unitCost = toAmount(row.unitCost);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error("Producto inválido");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Cantidad inválida");
    }
    if (unitCost < 0) {
      throw new Error("Costo unitario inválido");
    }

    const existing = merged.get(productId);
    if (existing) {
      merged.set(productId, {
        quantity: existing.quantity + quantity,
        unitCost,
      });
    } else {
      merged.set(productId, { quantity, unitCost });
    }
  }

  if (merged.size === 0) {
    throw new Error("Agrega al menos un producto a la compra");
  }

  return [...merged.entries()].map(([productId, { quantity, unitCost }]) => ({
    productId,
    quantity,
    unitCost,
  }));
}

export function calcPurchaseTotal(lines: PurchaseLineInput[]) {
  return lines.reduce(
    (sum, line) => sum + lineTotal(line.unitCost, line.quantity),
    0,
  );
}

export async function incrementStockForPurchase(
  tx: Tx,
  lines: PurchaseLineInput[],
  branchId?: number | null,
) {
  if (branchId) {
    await incrementBranchStock(
      tx,
      branchId,
      lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    );
    return;
  }

  for (const { productId, quantity } of lines) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new Error(`Producto #${productId} no encontrado`);
    }

    await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: quantity } },
    });
    await syncProductTotalStock(tx, productId);
  }
}

import { lineTotal, toAmount } from "@/shared/utils/money";

export type ProductSaleLineInput = {
  productId: number;
  quantity: number;
  unitPrice: number;
};

export function parseProductSaleLines(lines: unknown): ProductSaleLineInput[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("Agrega al menos un producto");
  }

  const merged = new Map<number, { quantity: number; unitPrice: number }>();

  for (const item of lines) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = Number(row.productId);
    const quantity = Number(row.quantity ?? 1);
    const unitPrice = toAmount(row.unitPrice);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error("Producto inválido");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Cantidad inválida");
    }
    if (unitPrice < 0) {
      throw new Error("Precio unitario inválido");
    }

    const existing = merged.get(productId);
    if (existing) {
      merged.set(productId, {
        quantity: existing.quantity + quantity,
        unitPrice,
      });
    } else {
      merged.set(productId, { quantity, unitPrice });
    }
  }

  if (merged.size === 0) {
    throw new Error("Agrega al menos un producto");
  }

  return [...merged.entries()].map(([productId, { quantity, unitPrice }]) => ({
    productId,
    quantity,
    unitPrice,
  }));
}

export function calcProductSaleTotal(lines: ProductSaleLineInput[]): number {
  return lines.reduce(
    (sum, line) => sum + lineTotal(line.unitPrice, line.quantity),
    0,
  );
}

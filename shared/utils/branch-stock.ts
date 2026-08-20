import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export async function syncProductTotalStock(tx: Tx, productId: number) {
  const rows = await tx.branchStock.findMany({
    where: { productId },
    select: { quantity: true },
  });
  const total = rows.reduce((sum, r) => sum + r.quantity, 0);
  await tx.product.update({
    where: { id: productId },
    data: { stock: total },
  });
  return total;
}

export async function deductBranchStock(
  tx: Tx,
  branchId: number | null | undefined,
  items: Array<{ productId: number; quantity: number }>,
) {
  if (!branchId || items.length === 0) return;

  for (const { productId, quantity } of items) {
    const row = await tx.branchStock.findUnique({
      where: {
        storeId_productId: { storeId: branchId, productId },
      },
    });
    if (!row || row.quantity < quantity) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      throw new Error(
        `Stock insuficiente de "${product?.name ?? "producto"}" en la sucursal`,
      );
    }
    await tx.branchStock.update({
      where: {
        storeId_productId: { storeId: branchId, productId },
      },
      data: { quantity: { decrement: quantity } },
    });
    await syncProductTotalStock(tx, productId);
  }
}

export async function incrementBranchStock(
  tx: Tx,
  branchId: number | null | undefined,
  items: Array<{ productId: number; quantity: number }>,
) {
  if (!branchId || items.length === 0) return;

  for (const { productId, quantity } of items) {
    await tx.branchStock.upsert({
      where: {
        storeId_productId: { storeId: branchId, productId },
      },
      create: { storeId: branchId, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    await syncProductTotalStock(tx, productId);
  }
}

export async function transferBranchStock(
  tx: Tx,
  params: {
    fromBranchId: number;
    toBranchId: number;
    userId: number;
    notes?: string;
    lines: Array<{ productId: number; quantity: number }>;
  },
) {
  const { fromBranchId, toBranchId, notes = "", lines } = params;
  if (fromBranchId === toBranchId) {
    throw new Error("La sucursal origen y destino deben ser distintas");
  }
  if (lines.length === 0) {
    throw new Error("Agrega al menos un producto");
  }

  await deductBranchStock(tx, fromBranchId, lines);
  await incrementBranchStock(tx, toBranchId, lines);
  void notes;
}

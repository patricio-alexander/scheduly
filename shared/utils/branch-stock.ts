import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export async function syncProductTotalStock(tx: Tx, productId: number) {
  const rows = await tx.branchStock.findMany({
    where: { productId },
    select: { stock: true },
  });
  const total = rows.reduce((sum, r) => sum + r.stock, 0);
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
      where: { branchId_productId: { branchId, productId } },
    });
    if (!row || row.stock < quantity) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      throw new Error(
        `Stock insuficiente de "${product?.name ?? "producto"}" en la sucursal`,
      );
    }
    await tx.branchStock.update({
      where: { branchId_productId: { branchId, productId } },
      data: { stock: { decrement: quantity } },
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
      where: { branchId_productId: { branchId, productId } },
      create: { branchId, productId, stock: quantity },
      update: { stock: { increment: quantity } },
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
  const { fromBranchId, toBranchId, userId, notes = "", lines } = params;
  if (fromBranchId === toBranchId) {
    throw new Error("La sucursal origen y destino deben ser distintas");
  }
  if (lines.length === 0) {
    throw new Error("Agrega al menos un producto");
  }

  await deductBranchStock(tx, fromBranchId, lines);
  await incrementBranchStock(tx, toBranchId, lines);

  return tx.stockTransfer.create({
    data: {
      fromBranchId,
      toBranchId,
      userId,
      notes,
      lines: {
        create: lines.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
      },
    },
    include: {
      fromBranch: { select: { name: true } },
      toBranch: { select: { name: true } },
      lines: { include: { product: { select: { name: true } } } },
    },
  });
}

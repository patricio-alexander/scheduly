import type { PrismaClient } from "@/generated/prisma/client";
import { recordStockMovements } from "@/shared/utils/stock-movement-log";

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
    movedAt?: Date;
  },
) {
  const {
    fromBranchId,
    toBranchId,
    userId,
    notes = "",
    lines,
    movedAt,
  } = params;
  if (fromBranchId === toBranchId) {
    throw new Error("La sucursal origen y destino deben ser distintas");
  }
  if (lines.length === 0) {
    throw new Error("Agrega al menos un producto");
  }

  const [fromBranch, toBranch, products] = await Promise.all([
    tx.branch.findUnique({
      where: { id: fromBranchId },
      select: { id: true, name: true },
    }),
    tx.branch.findUnique({
      where: { id: toBranchId },
      select: { id: true, name: true },
    }),
    tx.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
      select: { id: true, name: true, price: true },
    }),
  ]);
  if (!fromBranch || !toBranch) {
    throw new Error("Sucursal no encontrada");
  }

  await deductBranchStock(tx, fromBranchId, lines);
  await incrementBranchStock(tx, toBranchId, lines);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const date = movedAt ?? new Date();
  const desc = `Traspaso ${fromBranch.name} → ${toBranch.name}${notes ? ` · ${notes}` : ""}`;

  // Kardex: salida en origen + entrada en destino (tipo traspaso vía reason)
  await recordStockMovements(
    tx,
    userId,
    "salida",
    lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      price: productMap.get(l.productId)?.price ?? null,
    })),
    {
      description: desc,
      reason: "traspaso",
      referenceType: "stock_transfer_out",
      referenceId: fromBranchId,
      date,
    },
  );
  await recordStockMovements(
    tx,
    userId,
    "entrada",
    lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      price: productMap.get(l.productId)?.price ?? null,
    })),
    {
      description: desc,
      reason: "traspaso",
      referenceType: "stock_transfer_in",
      referenceId: toBranchId,
      date,
    },
  );

  return {
    id: Date.now(),
    fromBranchId,
    toBranchId,
    notes,
    createdAt: date.toISOString(),
    fromBranch,
    toBranch,
    user: { id: userId, name: null as string | null },
    lines: lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      product: {
        id: l.productId,
        name: productMap.get(l.productId)?.name ?? `Producto #${l.productId}`,
      },
    })),
  };
}

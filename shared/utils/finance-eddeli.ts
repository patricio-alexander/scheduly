import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";

/** Total de una venta POS (líneas). */
export function saleLinesTotal(
  lines: Array<{ quantity: number; price: number }>,
) {
  return lines.reduce(
    (sum, line) => sum + toAmount(line.quantity) * toAmount(line.price),
    0,
  );
}

/** Total de una orden de compra (líneas). */
export function purchaseLinesTotal(
  lines: Array<{ quantity: number; unitPrice: number; discount?: number }>,
) {
  return lines.reduce((sum, line) => {
    const gross = toAmount(line.quantity) * toAmount(line.unitPrice);
    return sum + Math.max(0, gross - toAmount(line.discount ?? 0));
  }, 0);
}

export async function fetchIncomesInRange(start: Date, end: Date) {
  return prisma.income.findMany({
    where: {
      date: { gte: start, lte: end },
      status: "paid",
    },
    orderBy: { date: "asc" },
  });
}

export async function fetchExpensesInRange(start: Date, end: Date) {
  return prisma.expense.findMany({
    where: {
      date: { gte: start, lte: end },
      status: "paid",
    },
    orderBy: { date: "asc" },
  });
}

export async function fetchPaidSalesInRange(start: Date, end: Date) {
  return prisma.sale.findMany({
    where: {
      OR: [
        { paidAt: { gte: start, lte: end } },
        { paidAt: null, date: { gte: start, lte: end }, status: "pagado" },
      ],
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          firstLastName: true,
          secondLastName: true,
        },
      },
      seller: { select: { id: true, username: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, price: true } },
        },
      },
    },
    orderBy: [{ paidAt: "desc" }, { date: "desc" }],
    take: 500,
  });
}

export async function fetchPurchaseOrdersInRange(start: Date, end: Date) {
  return prisma.purchaseOrder.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      supplier: { select: { id: true, name: true } },
      receivedBranch: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, price: true } },
        },
      },
    },
    orderBy: { date: "desc" },
    take: 500,
  });
}

export function customerDisplayName(c: {
  name: string;
  firstLastName?: string | null;
  secondLastName?: string | null;
}) {
  return [c.name, c.firstLastName, c.secondLastName].filter(Boolean).join(" ");
}

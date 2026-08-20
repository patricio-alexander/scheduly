import { prisma } from "@/shared/utils/prisma";
import {
  computeExpectedCash,
  movementCategoryLabel,
} from "@/shared/utils/turno-cash";
import { toAmount } from "@/shared/utils/money";

function isTransferMethod(method: string | null | undefined) {
  const m = String(method || "").toLowerCase();
  return m === "transfer" || m === "transferencia";
}

function isCardMethod(method: string | null | undefined) {
  const m = String(method || "").toLowerCase();
  return m === "card" || m === "tarjeta";
}

export async function sumShiftSales(shiftId: number) {
  const sales = await prisma.sale.findMany({
    where: {
      shiftId,
      status: { in: ["pagado", "entregado"] },
    },
    include: {
      lines: { select: { quantity: true, price: true } },
    },
  });

  let salesCash = 0;
  let salesTransfer = 0;
  let salesCard = 0;
  let salesTotal = 0;

  for (const sale of sales) {
    const total = sale.lines.reduce(
      (sum, line) => sum + toAmount(line.quantity) * toAmount(line.price),
      0,
    );
    salesTotal += total;
    if (isTransferMethod(sale.paymentMethod)) salesTransfer += total;
    else if (isCardMethod(sale.paymentMethod)) salesCard += total;
    else if (String(sale.paymentMethod || "").toLowerCase() === "credito") {
      /* crédito no suma al arqueo de efectivo */
    } else {
      salesCash += total;
    }
  }

  return {
    salesCash: Number(salesCash.toFixed(2)),
    salesTransfer: Number(salesTransfer.toFixed(2)),
    salesCard: Number(salesCard.toFixed(2)),
    salesTotal: Number(salesTotal.toFixed(2)),
    orderCount: sales.length,
  };
}

export async function getShiftMovementsSummary(shiftId: number) {
  const movements = await prisma.cashShiftMovement.findMany({
    where: { shiftId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let cashOut = 0;
  let cashIn = 0;
  for (const m of movements) {
    const amt = toAmount(m.amount);
    if (m.direction === "out") cashOut += amt;
    else cashIn += amt;
  }

  return {
    cashOut: Number(cashOut.toFixed(2)),
    cashIn: Number(cashIn.toFixed(2)),
    items: movements.map((m) => ({
      id: m.id,
      direction: m.direction,
      category: m.category,
      categoryLabel: movementCategoryLabel(m.category),
      amount: toAmount(m.amount),
      concept: m.concept,
      notes: m.notes,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function buildActiveShiftPayload(shiftId: number) {
  const shift = await prisma.cashShift.findUnique({
    where: { id: shiftId },
    include: {
      branch: { select: { id: true, name: true, establishmentCode: true, emissionPointCode: true } },
      cashRegister: { select: { id: true, name: true, code: true } },
      person: {
        select: { id: true, firstName: true, firstLastName: true },
      },
    },
  });
  if (!shift) return null;

  const [sales, movements, registers] = await Promise.all([
    sumShiftSales(shift.id),
    getShiftMovementsSummary(shift.id),
    shift.storeId
      ? prisma.cashRegister.findMany({
          where: { storeId: shift.storeId, isActive: true },
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            code: true,
            storeId: true,
            emissionPointCode: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const opening = toAmount(shift.openingCashTotal);
  const expectedCashTotal = computeExpectedCash(
    opening,
    sales.salesCash,
    movements.cashOut,
    movements.cashIn,
  );

  return {
    id: shift.id,
    status: shift.status,
    accountId: shift.accountId,
    userId: shift.userId,
    storeId: shift.storeId,
    activeCashRegisterId: shift.activeCashRegisterId,
    openedAt: shift.openedAt.toISOString(),
    openingCashTotal: opening,
    openingCashCounts: shift.openingCashCounts,
    openingNotes: shift.openingNotes,
    store: shift.branch,
    cashRegister: shift.cashRegister,
    cashier: [shift.person.firstName, shift.person.firstLastName]
      .filter(Boolean)
      .join(" "),
    cashRegisters: registers,
    sales: {
      salesCash: sales.salesCash,
      salesTransfer: sales.salesTransfer,
      salesCard: sales.salesCard,
      salesTotal: sales.salesTotal,
    },
    cashMovements: movements,
    expectedCashTotal,
    orderCount: sales.orderCount,
  };
}

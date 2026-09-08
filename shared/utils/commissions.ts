/**
 * Comisión de una cita: servicios + productos (producto o categoría).
 */
import type { PrismaClient } from "@/generated/prisma/client";
import { lineTotal, toAmount } from "@/shared/utils/money";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export const DEFAULT_COMMISSION_PCT = 15;

type AppointmentServiceForCommission = {
  service: { price: unknown; commissionPct: unknown };
};

type AppointmentProductForCommission = {
  product: {
    price: unknown;
    commissionPct?: unknown;
    category?: { commissionPct?: unknown } | null;
  };
  quantity: unknown;
};

/** % efectivo del producto: propio si > 0, si no el de categoría. */
export function resolveProductCommissionPct(product: {
  commissionPct?: unknown;
  category?: { commissionPct?: unknown } | null;
}): number {
  const own = toAmount(product.commissionPct);
  if (own > 0) return own;
  return toAmount(product.category?.commissionPct);
}

export function calcAppointmentCommission(
  services: AppointmentServiceForCommission[],
  products: AppointmentProductForCommission[],
  paidAmount: number,
) {
  const servicesTotal = services.reduce(
    (sum, { service }) => sum + toAmount(service.price),
    0,
  );
  const productsTotal = products.reduce(
    (sum, { product, quantity }) => sum + lineTotal(product.price, quantity),
    0,
  );
  const total = servicesTotal + productsTotal;

  const servicesCommission = services.reduce(
    (sum, { service }) =>
      sum +
      toAmount(service.price) *
        ((toAmount(service.commissionPct) || DEFAULT_COMMISSION_PCT) / 100),
    0,
  );

  const productsCommission = products.reduce((sum, { product, quantity }) => {
    const line = lineTotal(product.price, quantity);
    const pct = resolveProductCommissionPct(product);
    return sum + line * (pct / 100);
  }, 0);

  const rawCommission = servicesCommission + productsCommission;
  const scale = total > 0 ? paidAmount / total : 1;
  const amount = Math.round(rawCommission * scale * 100) / 100;
  const ratePct =
    paidAmount > 0 ? Math.round((amount / paidAmount) * 10000) / 100 : 0;

  return {
    amount,
    ratePct,
    baseAmount: paidAmount,
    servicesCommission: Math.round(servicesCommission * scale * 100) / 100,
    productsCommission: Math.round(productsCommission * scale * 100) / 100,
  };
}

export async function recordCommissionForPayment(
  tx: Tx,
  params: {
    userId: number;
    appointmentId: number;
    baseAmount: number;
    amount: number;
    ratePct: number;
  },
) {
  await tx.commissionRecord.upsert({
    where: { appointmentId: params.appointmentId },
    create: {
      userId: params.userId,
      appointmentId: params.appointmentId,
      baseAmount: params.baseAmount,
      ratePct: params.ratePct,
      amount: params.amount,
    },
    update: {
      baseAmount: params.baseAmount,
      ratePct: params.ratePct,
      amount: params.amount,
    },
  });

  return params.amount;
}

/** Marca comisiones pendientes como liquidadas al registrar un pago al empleado. */
export async function settleCommissionsForEmployeePayment(
  tx: Tx,
  params: {
    userId: number;
    branchId: number | null;
    paymentAmount: number;
    periodStart?: Date;
    periodEnd?: Date;
  },
) {
  const amount = Math.round(params.paymentAmount * 100) / 100;
  if (amount <= 0) return { settledAmount: 0, settledCount: 0 };

  const records = await tx.commissionRecord.findMany({
    where: {
      userId: params.userId,
      settledAt: null,
      ...(params.branchId
        ? { appointment: { branchId: params.branchId } }
        : {}),
      ...(params.periodStart && params.periodEnd
        ? { createdAt: { gte: params.periodStart, lte: params.periodEnd } }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, amount: true },
  });

  let remaining = amount;
  let settledAmount = 0;
  let settledCount = 0;
  const now = new Date();
  const idsToSettle: number[] = [];

  for (const record of records) {
    const lineAmount = toAmount(record.amount);
    if (lineAmount <= 0) {
      idsToSettle.push(record.id);
      continue;
    }
    if (remaining + 0.001 < lineAmount) break;
    idsToSettle.push(record.id);
    remaining = Math.round((remaining - lineAmount) * 100) / 100;
    settledAmount = Math.round((settledAmount + lineAmount) * 100) / 100;
    settledCount += 1;
  }

  if (idsToSettle.length === 0) {
    return { settledAmount: 0, settledCount: 0 };
  }

  await tx.commissionRecord.updateMany({
    where: { id: { in: idsToSettle }, settledAt: null },
    data: { settledAt: now },
  });

  return { settledAmount, settledCount };
}

/**
 * Alinea comisiones pendientes con pagos ya registrados (p. ej. pagos hechos antes de settledAt).
 * Usa FIFO: el monto pagado menos lo ya liquidado se aplica a comisiones sin settledAt.
 */
export async function reconcileCommissionSettlementsForUser(
  client: Tx | PrismaClient,
  userId: number,
) {
  const [paymentsAgg, settledAgg, unsettledRecords] = await Promise.all([
    client.employeePayment.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    client.commissionRecord.aggregate({
      where: { userId, settledAt: { not: null } },
      _sum: { amount: true },
    }),
    client.commissionRecord.findMany({
      where: { userId, settledAt: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, amount: true },
    }),
  ]);

  const totalPaid = toAmount(paymentsAgg._sum.amount ?? 0);
  const alreadySettled = toAmount(settledAgg._sum.amount ?? 0);
  let budget = Math.round((totalPaid - alreadySettled) * 100) / 100;

  if (budget <= 0 || unsettledRecords.length === 0) {
    return { settledCount: 0 };
  }

  const idsToSettle: number[] = [];
  for (const record of unsettledRecords) {
    const lineAmount = toAmount(record.amount);
    if (lineAmount <= 0) {
      idsToSettle.push(record.id);
      continue;
    }
    if (budget + 0.001 < lineAmount) break;
    idsToSettle.push(record.id);
    budget = Math.round((budget - lineAmount) * 100) / 100;
  }

  if (idsToSettle.length === 0) {
    return { settledCount: 0 };
  }

  await client.commissionRecord.updateMany({
    where: { id: { in: idsToSettle }, settledAt: null },
    data: { settledAt: new Date() },
  });

  return { settledCount: idsToSettle.length };
}

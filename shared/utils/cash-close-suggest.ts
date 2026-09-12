import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import {
  defaultMediumCodeForMethod,
  ensureDefaultPaymentMedia,
} from "@/shared/utils/payment-media";
import { toDateKey } from "@/shared/utils/payroll-settings";

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Suma cobros reales del día (citas + ventas POS) por medio/banco,
 * para que la Dueña cuadre De Una / Loja / Pichincha / efectivo.
 */
export async function suggestCashCloseByMedium(opts: {
  branchId: number;
  date: Date;
}) {
  await ensureDefaultPaymentMedia(prisma);
  const { start, end } = dayBounds(opts.date);
  const media = await prisma.paymentMedium.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  const byCode = new Map(media.map((m) => [String(m.code || ""), m]));
  const totals = new Map<number, number>();

  const bump = (mediumId: number | null | undefined, method: string, amount: number) => {
    const amt = toAmount(amount);
    if (amt <= 0) return;
    let id = mediumId ?? null;
    if (!id) {
      const code = defaultMediumCodeForMethod(method);
      id = byCode.get(code)?.id ?? null;
    }
    if (!id) return;
    totals.set(id, toAmount((totals.get(id) || 0) + amt));
  };

  const payments = await prisma.appointmentPayment.findMany({
    where: {
      paidAt: { gte: start, lte: end },
      appointment: { branchId: opts.branchId },
    },
    select: {
      amount: true,
      method: true,
      paymentMediumId: true,
    },
  });
  for (const p of payments) {
    bump(p.paymentMediumId, p.method, p.amount);
  }

  const sales = await prisma.sale.findMany({
    where: {
      status: "pagado",
      paidAt: { gte: start, lte: end },
      OR: [
        { shift: { storeId: opts.branchId } },
        {
          lines: {
            some: { deliveredStoreId: opts.branchId },
          },
        },
      ],
    },
    select: {
      paymentMethod: true,
      paymentMediumId: true,
      lines: { select: { quantity: true, price: true } },
    },
  });
  for (const s of sales) {
    const total = s.lines.reduce(
      (acc, l) => acc + toAmount(l.quantity) * toAmount(l.price),
      0,
    );
    bump(s.paymentMediumId, s.paymentMethod || "cash", total);
  }

  const lines = media
    .map((m) => ({
      paymentMediumId: m.id,
      amount: totals.get(m.id) || 0,
      medium: {
        id: m.id,
        name: m.name,
        code: m.code,
        kind: m.kind,
      },
    }))
    .filter((l) => l.amount > 0);

  const linesTotal = toAmount(lines.reduce((s, l) => s + l.amount, 0));

  return {
    branchId: opts.branchId,
    date: toDateKey(opts.date),
    lines,
    linesTotal,
    media,
  };
}

/** Resumen multi-sucursal (Dueña) por medio en un día o rango. */
export async function revenueByMediumSummary(opts: {
  from: Date;
  to: Date;
  branchId?: number | null;
}) {
  await ensureDefaultPaymentMedia(prisma);
  const media = await prisma.paymentMedium.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  const byCode = new Map(media.map((m) => [String(m.code || ""), m]));
  const totals = new Map<number, { amount: number; count: number }>();

  const bump = (
    mediumId: number | null | undefined,
    method: string,
    amount: number,
  ) => {
    const amt = toAmount(amount);
    if (amt <= 0) return;
    let id = mediumId ?? null;
    if (!id) {
      const code = defaultMediumCodeForMethod(method);
      id = byCode.get(code)?.id ?? null;
    }
    if (!id) return;
    const cur = totals.get(id) || { amount: 0, count: 0 };
    cur.amount = toAmount(cur.amount + amt);
    cur.count += 1;
    totals.set(id, cur);
  };

  const aptWhere = {
    paidAt: { gte: opts.from, lte: opts.to },
    ...(opts.branchId
      ? { appointment: { branchId: opts.branchId } }
      : {}),
  };

  const payments = await prisma.appointmentPayment.findMany({
    where: aptWhere,
    select: {
      amount: true,
      method: true,
      paymentMediumId: true,
      appointment: { select: { branchId: true } },
    },
  });
  for (const p of payments) bump(p.paymentMediumId, p.method, p.amount);

  const sales = await prisma.sale.findMany({
    where: {
      status: "pagado",
      paidAt: { gte: opts.from, lte: opts.to },
      ...(opts.branchId
        ? {
            OR: [
              { shift: { storeId: opts.branchId } },
              { lines: { some: { deliveredStoreId: opts.branchId } } },
            ],
          }
        : {}),
    },
    select: {
      paymentMethod: true,
      paymentMediumId: true,
      lines: { select: { quantity: true, price: true } },
    },
  });
  for (const s of sales) {
    const total = s.lines.reduce(
      (acc, l) => acc + toAmount(l.quantity) * toAmount(l.price),
      0,
    );
    bump(s.paymentMediumId, s.paymentMethod || "cash", total);
  }

  const byMedium = media.map((m) => {
    const t = totals.get(m.id) || { amount: 0, count: 0 };
    return {
      paymentMediumId: m.id,
      name: m.name,
      code: m.code,
      kind: m.kind,
      amount: t.amount,
      count: t.count,
    };
  });

  return {
    from: opts.from.toISOString(),
    to: opts.to.toISOString(),
    branchId: opts.branchId ?? null,
    byMedium,
    total: toAmount(byMedium.reduce((s, r) => s + r.amount, 0)),
  };
}

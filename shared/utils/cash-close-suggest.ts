import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import {
  defaultMediumCodeForMethod,
  ensureDefaultPaymentMedia,
} from "@/shared/utils/payment-media";
import { toDateKey } from "@/shared/utils/payroll-settings";
import { mediaFromCounts } from "@/shared/utils/turno-cash";

function dayBounds(date: Date) {
  const key = toDateKey(date);
  const start = new Date(`${key}T00:00:00`);
  const end = new Date(`${key}T23:59:59.999`);
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
      status: { in: ["pagado", "entregado"] },
      OR: [
        { paidAt: { gte: start, lte: end } },
        { paidAt: null, date: { gte: start, lte: end } },
      ],
      AND: [
        {
          OR: [
            { shift: { storeId: opts.branchId } },
            {
              lines: {
                some: { deliveredStoreId: opts.branchId },
              },
            },
          ],
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

  const leftover = new Map<number, number>();
  const shifts = await prisma.cashShift.findMany({
    where: {
      storeId: opts.branchId,
      openedAt: { lte: end },
      OR: [{ closedAt: null }, { closedAt: { gte: start } }],
    },
    select: {
      openingCashCounts: true,
      openingCashTotal: true,
      closingCashTotal: true,
      status: true,
    },
  });
  let openingCash = 0;
  let countedCash: number | null = shifts.length > 0 ? 0 : null;
  for (const shift of shifts) {
    openingCash = toAmount(openingCash + toAmount(shift.openingCashTotal));
    const opening = mediaFromCounts(shift.openingCashCounts);
    for (const [rawId, amount] of Object.entries(opening)) {
      const id = Number(rawId);
      if (!Number.isFinite(id) || amount <= 0) continue;
      leftover.set(id, toAmount((leftover.get(id) || 0) + amount));
    }
    if (countedCash != null) {
      if (shift.status !== "closed" || shift.closingCashTotal == null) {
        countedCash = null;
      } else {
        countedCash = toAmount(countedCash + toAmount(shift.closingCashTotal));
      }
    }
  }

  const movements = await prisma.cashShiftMovement.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      shift: { storeId: opts.branchId },
    },
    select: { direction: true, amount: true },
  });
  let cashOut = 0;
  let cashIn = 0;
  for (const movement of movements) {
    const amount = toAmount(movement.amount);
    if (movement.direction === "out") cashOut = toAmount(cashOut + amount);
    if (movement.direction === "in") cashIn = toAmount(cashIn + amount);
  }

  const lines = media
    .map((m) => {
      const collected = totals.get(m.id) || 0;
      const kind = String(m.kind || "").toLowerCase();
      const amount =
        kind === "cash"
          ? countedCash != null
            ? countedCash
            : toAmount(openingCash + collected - cashOut + cashIn)
          : toAmount(
              collected +
                (kind === "transfer" || kind === "card"
                  ? leftover.get(m.id) || 0
                  : 0),
            );
      return {
        paymentMediumId: m.id,
        amount,
        medium: {
          id: m.id,
          name: m.name,
          code: m.code,
          kind: m.kind,
        },
      };
    })
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

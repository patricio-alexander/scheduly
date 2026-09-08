import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import {
  isPaidSale,
  saleTotal,
} from "@/shared/utils/dashboard-eddeli-metrics";

export type FinanceLedgerRow = {
  id: number;
  date: string;
  amount: number;
  concept: string;
  category: string;
  status: string;
  counterpartyName: string | null;
  referenceType: string | null;
  referenceId: number | null;
  /** false = fila virtual (aún no persistida en Income/Expense) */
  persisted: boolean;
};

type RefKey = string;
function refKey(type: string, id: number): RefKey {
  return `${type}:${id}`;
}

/** Ingresos para el módulo Finanzas: ledger + cobros de cita + ventas POS. */
export async function listFinanceIncomes(
  take = 2000,
): Promise<FinanceLedgerRow[]> {
  const [incomes, appointmentPayments, sales] = await Promise.all([
    prisma.income.findMany({
      where: { status: "paid" },
      orderBy: { date: "desc" },
      take,
    }),
    prisma.appointmentPayment.findMany({
      orderBy: { paidAt: "desc" },
      take,
      include: {
        appointment: {
          select: {
            id: true,
            customer: { select: { name: true } },
          },
        },
      },
    }),
    prisma.sale.findMany({
      where: {
        OR: [{ status: "pagado" }, { paidAt: { not: null } }],
      },
      orderBy: { date: "desc" },
      take,
      include: {
        customer: { select: { name: true } },
        lines: {
          select: {
            quantity: true,
            price: true,
            damagedQty: true,
            giftQty: true,
          },
        },
      },
    }),
  ]);

  const salesWithLink = await prisma.sale.findMany({
    where: {
      financeIncomeId: { not: null },
      OR: [{ status: "pagado" }, { paidAt: { not: null } }],
    },
    select: { id: true },
    take,
  });
  const linkedSaleIds = new Set(salesWithLink.map((s) => s.id));

  const covered = new Set<RefKey>();
  const rows: FinanceLedgerRow[] = [];

  for (const i of incomes) {
    if (i.referenceType && i.referenceId != null) {
      covered.add(refKey(i.referenceType, i.referenceId));
    }
    rows.push({
      id: i.id,
      date: i.date.toISOString(),
      amount: toAmount(i.amount),
      concept: i.concept ?? "",
      category: i.category ?? "",
      status: i.status,
      counterpartyName: i.counterpartyName,
      referenceType: i.referenceType,
      referenceId: i.referenceId,
      persisted: true,
    });
  }

  for (const pay of appointmentPayments) {
    const key = refKey("appointment_payment", pay.id);
    if (covered.has(key)) continue;
    covered.add(key);
    rows.push({
      id: -pay.id,
      date: pay.paidAt.toISOString(),
      amount: toAmount(pay.amount),
      concept: `Cobro cita #${pay.appointmentId}`,
      category: "Cita / servicio",
      status: "paid",
      counterpartyName: pay.appointment.customer?.name ?? null,
      referenceType: "appointment_payment",
      referenceId: pay.id,
      persisted: false,
    });
  }

  for (const sale of sales) {
    if (!isPaidSale(sale)) continue;
    if (linkedSaleIds.has(sale.id)) continue;
    const key = refKey("sale", sale.id);
    if (covered.has(key)) continue;
    const amount = saleTotal(sale);
    if (amount <= 0) continue;
    covered.add(key);
    const ts = sale.paidAt ?? sale.date;
    rows.push({
      id: -1000000 - sale.id,
      date: ts.toISOString(),
      amount,
      concept: sale.notes?.includes("[CAJA_POS]")
        ? `Venta POS #${sale.id}`
        : `Venta #${sale.id}`,
      category: "Venta POS",
      status: "paid",
      counterpartyName: sale.customer?.name ?? null,
      referenceType: "sale",
      referenceId: sale.id,
      persisted: false,
    });
  }

  rows.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return rows.slice(0, take);
}

/** Gastos para Finanzas: ledger + pagos a proveedores / compras pagadas. */
export async function listFinanceExpenses(
  take = 2000,
): Promise<FinanceLedgerRow[]> {
  const [expenses, supplierPayments, paidOrders] = await Promise.all([
    prisma.expense.findMany({
      where: { status: "paid" },
      orderBy: { date: "desc" },
      take,
    }),
    prisma.supplierOrderPayment.findMany({
      where: { status: "completed" },
      orderBy: { date: "desc" },
      take,
      include: {
        supplier: { select: { name: true, tradeName: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { paidAt: { not: null } },
      orderBy: { date: "desc" },
      take,
      include: {
        supplier: { select: { name: true, tradeName: true } },
        lines: { select: { quantity: true, unitPrice: true } },
        payments: {
          where: { status: "completed" },
          select: { id: true, amount: true },
        },
      },
    }),
  ]);

  const covered = new Set<RefKey>();
  const rows: FinanceLedgerRow[] = [];

  for (const e of expenses) {
    if (e.referenceType && e.referenceId != null) {
      covered.add(refKey(e.referenceType, e.referenceId));
    }
    rows.push({
      id: e.id,
      date: e.date.toISOString(),
      amount: toAmount(e.amount),
      concept: e.concept ?? "",
      category: e.category ?? "",
      status: e.status,
      counterpartyName: e.counterpartyName,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      persisted: true,
    });
  }

  for (const pay of supplierPayments) {
    const key = refKey("supplier_payment", pay.id);
    if (covered.has(key)) continue;
    if (pay.expenseId) continue; // ya en ledger vía FK
    covered.add(key);
    const name = pay.supplier.tradeName?.trim() || pay.supplier.name;
    rows.push({
      id: -pay.id,
      date: pay.date.toISOString(),
      amount: toAmount(pay.amount),
      concept: pay.note || `Pago proveedor PO #${pay.supplierOrderId}`,
      category: "Compra de insumos",
      status: "paid",
      counterpartyName: name,
      referenceType: "supplier_payment",
      referenceId: pay.id,
      persisted: false,
    });
  }

  for (const po of paidOrders) {
    if (po.financeExpenseId) continue;
    if (po.payments.length > 0) continue; // cubierto por payments
    const amount = po.lines.reduce(
      (s, l) => s + toAmount(l.quantity) * toAmount(l.unitPrice),
      0,
    );
    if (amount <= 0 || !po.paidAt) continue;
    const key = refKey("purchase_order", po.id);
    if (covered.has(key)) continue;
    covered.add(key);
    const name = po.supplier.tradeName?.trim() || po.supplier.name;
    rows.push({
      id: -2000000 - po.id,
      date: po.paidAt.toISOString(),
      amount,
      concept: po.notes || `Compra PO #${po.id}`,
      category: "Compra de insumos",
      status: "paid",
      counterpartyName: name,
      referenceType: "purchase_order",
      referenceId: po.id,
      persisted: false,
    });
  }

  rows.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return rows.slice(0, take);
}

export function sumLedgerAmounts(rows: FinanceLedgerRow[]) {
  return Number(
    rows.reduce((s, r) => s + toAmount(r.amount), 0).toFixed(2),
  );
}

/**
 * Totales de cards financieras unificados (Panel + Finanzas).
 * Misma fuente: listFinanceIncomes / listFinanceExpenses (ledger + virtuales).
 */
import { toAmount } from "@/shared/utils/money";
import {
  isPayrollCategory,
  isPurchaseCategory,
} from "@/shared/utils/dashboard-eddeli-metrics";
import {
  listFinanceExpenses,
  listFinanceIncomes,
  sumLedgerAmounts,
  type FinanceLedgerRow,
} from "@/shared/utils/finance-ledger-list";
import {
  buildFinanceHero,
  type FinanceHeroSummary,
} from "@/shared/utils/dashboard-finance-hero";

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t <= end.getTime();
}

export function filterLedgerByRange(
  rows: FinanceLedgerRow[],
  start: Date,
  end: Date,
) {
  return rows.filter((r) => inRange(r.date, start, end));
}

export function splitExpenseBuckets(rows: FinanceLedgerRow[]) {
  let purchases = 0;
  let commissions = 0;
  let operating = 0;
  for (const r of rows) {
    const amount = toAmount(r.amount);
    if (isPurchaseCategory(r.category)) purchases += amount;
    else if (isPayrollCategory(r.category)) commissions += amount;
    else operating += amount;
  }
  return {
    purchases: Number(purchases.toFixed(2)),
    commissions: Number(commissions.toFixed(2)),
    operating: Number(operating.toFixed(2)),
    total: Number((purchases + commissions + operating).toFixed(2)),
  };
}

/** Totales ledger en un rango (misma lógica Panel/Finanzas). */
export async function fetchLedgerPeriodTotals(start: Date, end: Date) {
  const [allIncomes, allExpenses] = await Promise.all([
    listFinanceIncomes(8000),
    listFinanceExpenses(8000),
  ]);
  const incomes = filterLedgerByRange(allIncomes, start, end);
  const expenses = filterLedgerByRange(allExpenses, start, end);
  const incomeTotal = sumLedgerAmounts(incomes);
  const buckets = splitExpenseBuckets(expenses);
  return {
    incomes,
    expenses,
    incomeTotal,
    expenseTotal: buckets.total,
    purchases: buckets.purchases,
    commissions: buckets.commissions,
    operating: buckets.operating,
  };
}

export async function buildFinanceHeroFromLedger(opts: {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  pendingReceivable: number;
  periodLabel: string;
}): Promise<FinanceHeroSummary> {
  const [current, previous] = await Promise.all([
    fetchLedgerPeriodTotals(opts.start, opts.end),
    fetchLedgerPeriodTotals(opts.prevStart, opts.prevEnd),
  ]);

  const previousNet = Number(
    (previous.incomeTotal - previous.expenseTotal).toFixed(2),
  );

  return buildFinanceHero({
    revenue: current.incomeTotal,
    // operating only: buildFinanceHero suma expenses+purchases+commissions
    expenses: current.operating,
    purchases: current.purchases,
    commissions: current.commissions,
    pendingReceivable: opts.pendingReceivable,
    previousRevenue: previous.incomeTotal,
    previousNet,
    periodLabel: opts.periodLabel,
  });
}

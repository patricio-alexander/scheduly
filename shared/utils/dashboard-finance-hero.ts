import { toAmount } from "@/shared/utils/money";

export type FinanceHeroSummary = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  purchases: number;
  commissions: number;
  pendingReceivable: number;
  projectedBalance: number;
  marginPct: number;
  marginWithPendingPct: number;
  balanceWithPending: number;
  vsPreviousPct: number | null;
  periodLabel: string;
};

export type StockAlertItem = {
  id: string;
  productId: number;
  name: string;
  stock: number;
  minStock: number;
  branchName?: string | null;
};

export type StockAlertsBuckets = {
  agotados: StockAlertItem[];
  critico: StockAlertItem[];
  bajo: StockAlertItem[];
  precaucion: StockAlertItem[];
};

export type AppointmentStatusOverviewItem = {
  id: string;
  label: string;
  count: number;
  subtitle: string;
  tone: "accent" | "success" | "warning" | "danger" | "muted";
};

export function buildFinanceHero(input: {
  revenue: number;
  expenses: number;
  purchases: number;
  commissions: number;
  pendingReceivable: number;
  previousRevenue: number;
  previousNet: number;
  periodLabel: string;
}): FinanceHeroSummary {
  const totalExpense =
    input.expenses + input.purchases + input.commissions;
  const balance = input.revenue - totalExpense;
  const balanceWithPending = balance + input.pendingReceivable;
  const marginPct =
    input.revenue > 0
      ? Number(((balance / input.revenue) * 100).toFixed(1))
      : balance === 0
        ? 0
        : -100;
  const denomWithPending = input.revenue + input.pendingReceivable;
  const marginWithPendingPct =
    denomWithPending > 0
      ? Number(((balanceWithPending / denomWithPending) * 100).toFixed(1))
      : balanceWithPending === 0
        ? 0
        : -100;

  let vsPreviousPct: number | null = null;
  if (input.previousNet !== 0 || balance !== 0) {
    if (input.previousNet === 0) {
      vsPreviousPct = balance === 0 ? 0 : null;
    } else {
      vsPreviousPct = Number(
        (((balance - input.previousNet) / Math.abs(input.previousNet)) * 100).toFixed(
          1,
        ),
      );
    }
  }

  return {
    balance: toAmount(balance),
    totalIncome: toAmount(input.revenue),
    totalExpense: toAmount(totalExpense),
    purchases: toAmount(input.purchases),
    commissions: toAmount(input.commissions),
    pendingReceivable: toAmount(input.pendingReceivable),
    projectedBalance: toAmount(balanceWithPending),
    marginPct,
    marginWithPendingPct,
    balanceWithPending: toAmount(balanceWithPending),
    vsPreviousPct,
    periodLabel: input.periodLabel,
  };
}

export function classifyStockBucket(
  stock: number,
  minStock: number,
): keyof StockAlertsBuckets | null {
  if (stock <= 0) return "agotados";
  const min = Math.max(minStock, 0);
  if (min <= 0) return stock <= 5 ? "critico" : null;
  if (stock <= min) return "critico";
  if (stock <= min * 1.5) return "bajo";
  if (stock <= min * 2) return "precaucion";
  return null;
}

export function buildStockAlertBuckets(
  rows: Array<{
    productId: number;
    name: string;
    stock: number;
    minStock: number;
    branchName?: string | null;
  }>,
): StockAlertsBuckets {
  const buckets: StockAlertsBuckets = {
    agotados: [],
    critico: [],
    bajo: [],
    precaucion: [],
  };

  for (const row of rows) {
    const bucket = classifyStockBucket(row.stock, row.minStock);
    if (!bucket) continue;
    buckets[bucket].push({
      id: `${row.branchName ?? "g"}-${row.productId}`,
      productId: row.productId,
      name: row.name,
      stock: row.stock,
      minStock: row.minStock,
      branchName: row.branchName ?? null,
    });
  }

  for (const key of Object.keys(buckets) as Array<keyof StockAlertsBuckets>) {
    buckets[key].sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
  }

  return buckets;
}

export function buildAppointmentStatusOverview(counts: {
  scheduled: number;
  paid_pending: number;
  pending_payment: number;
  completed: number;
  cancelled: number;
  rescheduled: number;
}): AppointmentStatusOverviewItem[] {
  return [
    {
      id: "pending_payment",
      label: "Por cobrar",
      count: counts.pending_payment,
      subtitle: "Turnos sin pago",
      tone: "warning",
    },
    {
      id: "paid_pending",
      label: "Pagados pendientes",
      count: counts.paid_pending,
      subtitle: "Cobrado, por completar",
      tone: "accent",
    },
    {
      id: "scheduled",
      label: "Agendados",
      count: counts.scheduled,
      subtitle: "Confirmados",
      tone: "muted",
    },
    {
      id: "completed",
      label: "Completados",
      count: counts.completed,
      subtitle: "Cerrados en el período",
      tone: "success",
    },
    {
      id: "cancelled",
      label: "Cancelados",
      count: counts.cancelled,
      subtitle: "No realizados",
      tone: "danger",
    },
    {
      id: "rescheduled",
      label: "Reagendados",
      count: counts.rescheduled,
      subtitle: "Movidos de fecha",
      tone: "accent",
    },
  ];
}

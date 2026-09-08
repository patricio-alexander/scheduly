import { toAmount } from "@/shared/utils/money";
import type { AppointmentStatusOverviewItem } from "@/shared/utils/dashboard-finance-hero";
import type {
  DashboardPaymentBreakdownItem,
  DashboardRecentAppointment,
  DashboardTopEmployee,
} from "@/shared/utils/dashboard-widgets";
import { paymentMethodLabel, type PaymentMethodValue } from "@/shared/utils/payment-methods";

export type SaleLineLike = {
  quantity: number;
  price: number;
  soldQty?: number;
  damagedQty?: number;
  giftQty?: number;
};

export type SaleLike = {
  id: number;
  status: string;
  date: Date;
  paidAt: Date | null;
  paymentMethod: string | null;
  sellerAccountId: number | null;
  customer?: {
    name: string;
    firstLastName?: string | null;
    secondLastName?: string | null;
  } | null;
  seller?: { id: number; username: string } | null;
  lines: SaleLineLike[];
};

function normalizeSaleStatus(status: string) {
  const value = status.toLowerCase();
  if (value === "pagado" || value === "pagado") return "pagado";
  if (value === "entregado" || value === "entregado") return "entregado";
  if (value === "pendiente" || value === "pendiente") return "pendiente";
  return value;
}

export function saleLineTotal(line: SaleLineLike) {
  const qty = Math.max(
    0,
    toAmount(line.quantity) -
      toAmount(line.damagedQty ?? 0) -
      toAmount(line.giftQty ?? 0),
  );
  return qty * toAmount(line.price);
}

export function saleTotal(sale: { lines: SaleLineLike[] }) {
  return sale.lines.reduce((sum, line) => sum + saleLineTotal(line), 0);
}

export function isPaidSale(sale: { status: string; paidAt: Date | null }) {
  return normalizeSaleStatus(sale.status) === "pagado" || Boolean(sale.paidAt);
}

export function sumPaidSales(sales: SaleLike[]) {
  return sales.filter(isPaidSale).reduce((sum, sale) => sum + saleTotal(sale), 0);
}

export function sumPendingSales(sales: SaleLike[]) {
  return sales
    .filter(
      (sale) =>
        normalizeSaleStatus(sale.status) === "pendiente" && !sale.paidAt,
    )
    .reduce((sum, sale) => sum + saleTotal(sale), 0);
}

export function isPurchaseCategory(category: string | null | undefined) {
  return /compra/i.test(category ?? "");
}

export function isPayrollCategory(category: string | null | undefined) {
  return /empleado|honorario|comisi/i.test(category ?? "");
}

export function buildSaleStatusOverview(
  sales: Array<{ status: string }>,
): AppointmentStatusOverviewItem[] {
  const counts = { pendiente: 0, entregado: 0, pagado: 0 };
  for (const sale of sales) {
    const status = normalizeSaleStatus(sale.status);
    if (status === "pendiente") counts.pendiente += 1;
    else if (status === "entregado") counts.entregado += 1;
    else if (status === "pagado") counts.pagado += 1;
  }
  return [
    {
      id: "pending_payment",
      label: "Pendientes",
      count: counts.pendiente,
      subtitle: "Pedidos por cobrar",
      tone: "warning",
    },
    {
      id: "paid_pending",
      label: "Entregados",
      count: counts.entregado,
      subtitle: "Entregados al cliente",
      tone: "accent",
    },
    {
      id: "completed",
      label: "Pagados",
      count: counts.pagado,
      subtitle: "Cobrados",
      tone: "success",
    },
  ];
}

export function buildSalePaymentBreakdown(
  sales: SaleLike[],
  revenue: number,
): DashboardPaymentBreakdownItem[] {
  const byMethod = new Map<string, number>();
  for (const sale of sales.filter(isPaidSale)) {
    const raw = (sale.paymentMethod || "efectivo").toLowerCase();
    const method: PaymentMethodValue =
      raw.includes("credito") || raw.includes("tarjeta") || raw.includes("card")
        ? "card"
        : raw.includes("trans") || raw.includes("deposito")
          ? "transfer"
          : "cash";
    byMethod.set(method, (byMethod.get(method) ?? 0) + saleTotal(sale));
  }
  return [...byMethod.entries()]
    .map(([method, amount]) => ({
      method,
      label: paymentMethodLabel[method as PaymentMethodValue] ?? method,
      amount,
      sharePct: revenue > 0 ? Math.round((amount / revenue) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildTopSellersFromSales(
  sales: SaleLike[],
  limit = 6,
): DashboardTopEmployee[] {
  const map = new Map<number, DashboardTopEmployee>();
  for (const sale of sales.filter(isPaidSale)) {
    const id = sale.sellerAccountId ?? sale.seller?.id;
    if (!id) continue;
    const current = map.get(id) ?? {
      id,
      name: sale.seller?.username ?? `Vendedor #${id}`,
      revenue: 0,
      appointments: 0,
    };
    current.revenue += saleTotal(sale);
    current.appointments += 1;
    map.set(id, current);
  }
  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments)
    .slice(0, limit);
}

export function saleStatusToAppointmentStatus(status: string) {
  const normalized = normalizeSaleStatus(status);
  if (normalized === "pagado") return "completed";
  if (normalized === "entregado") return "paid_pending";
  if (normalized === "pendiente") return "pending_payment";
  return "scheduled";
}

export function recentSalesAsAppointments(
  sales: SaleLike[],
  limit = 8,
): DashboardRecentAppointment[] {
  return [...sales]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit)
    .map((sale) => ({
      id: sale.id,
      title: `Pedido #${sale.id}`,
      customer: [sale.customer?.name, sale.customer?.firstLastName, sale.customer?.secondLastName]
        .filter(Boolean)
        .join(" ")
        .trim() || "Consumidor final",
      date: (sale.paidAt ?? sale.date).toISOString(),
      status: saleStatusToAppointmentStatus(sale.status),
      employee: sale.seller?.username ?? null,
    }));
}

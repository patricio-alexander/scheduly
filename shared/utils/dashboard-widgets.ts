import { toAmount } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";

export type DashboardTopEmployee = {
  id: number;
  name: string;
  revenue: number;
  appointments: number;
};

export type DashboardPaymentBreakdownItem = {
  method: string;
  label: string;
  amount: number;
  sharePct: number;
};

export type DashboardRecentAppointment = {
  id: number;
  title: string;
  customer: string;
  date: string;
  status: string;
  employee?: string | null;
};

type RevenueAppointment = {
  userId: number;
  user: { id: number; name: string };
  payment: { amount: number; method?: string | null } | null;
  services: Array<{ service: { price: number } }>;
  products: Array<{ quantity: number; product: { price: number } }>;
};

export function appointmentRevenue(apt: {
  payment: { amount: number } | null;
  services: Array<{ service: { price: number } }>;
  products: Array<{ quantity: number; product: { price: number } }>;
}) {
  if (apt.payment) return toAmount(apt.payment.amount);
  const servicesTotal = apt.services.reduce(
    (s, as) => s + toAmount(as.service.price),
    0,
  );
  const productsTotal = apt.products.reduce(
    (p, ap) => p + toAmount(ap.product.price) * ap.quantity,
    0,
  );
  return servicesTotal + productsTotal;
}

export function buildTopEmployees(
  completedApts: RevenueAppointment[],
  limit = 6,
): DashboardTopEmployee[] {
  const employeeMap = new Map<number, DashboardTopEmployee>();
  for (const apt of completedApts) {
    const current = employeeMap.get(apt.userId) ?? {
      id: apt.userId,
      name: apt.user.name,
      revenue: 0,
      appointments: 0,
    };
    current.revenue += appointmentRevenue(apt);
    current.appointments += 1;
    employeeMap.set(apt.userId, current);
  }
  return [...employeeMap.values()]
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.appointments - a.appointments;
    })
    .slice(0, limit);
}

export function buildPaymentBreakdown(
  completedApts: Array<{
    payment: { amount: number; method?: string | null } | null;
    services: Array<{ service: { price: number } }>;
    products: Array<{ quantity: number; product: { price: number } }>;
  }>,
  revenue: number,
): DashboardPaymentBreakdownItem[] {
  const paymentMethods = completedApts.reduce(
    (acc, apt) => {
      const method = apt.payment?.method ?? "cash";
      const key = method as PaymentMethodValue;
      acc[key] = (acc[key] ?? 0) + appointmentRevenue(apt);
      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(paymentMethods)
    .map(([method, amount]) => ({
      method,
      label: paymentMethodLabel[method as PaymentMethodValue] ?? method,
      amount,
      sharePct: revenue > 0 ? Math.round((amount / revenue) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

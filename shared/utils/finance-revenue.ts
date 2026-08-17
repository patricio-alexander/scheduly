import { lineTotal, toAmount } from "@/shared/utils/money";

type AppointmentForRevenue = {
  payment: { amount: unknown; method: string } | null;
  services: Array<{ service: { price: unknown } }>;
  products: Array<{ product: { price: unknown }; quantity: unknown }>;
};

export function appointmentPaidAmount(apt: AppointmentForRevenue) {
  return toAmount(apt.payment?.amount ?? 0);
}

export function appointmentCatalogTotals(apt: AppointmentForRevenue) {
  const services = apt.services.reduce(
    (sum, row) => sum + toAmount(row.service.price),
    0,
  );
  const products = apt.products.reduce(
    (sum, row) => sum + lineTotal(row.product.price, row.quantity),
    0,
  );
  return { services, products, total: services + products };
}

/** Reparte el monto cobrado entre servicios y productos del turno (respeta descuentos). */
export function splitAppointmentPaidRevenue(apt: AppointmentForRevenue) {
  const paid = appointmentPaidAmount(apt);
  if (paid <= 0) return { services: 0, products: 0, paid: 0 };

  const catalog = appointmentCatalogTotals(apt);
  if (catalog.total <= 0) {
    return { services: paid, products: 0, paid };
  }

  const services =
    Math.round(((paid * catalog.services) / catalog.total) * 100) / 100;
  const products = Math.round((paid - services) * 100) / 100;

  return { services, products, paid };
}

export function sharePct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

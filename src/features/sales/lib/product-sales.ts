import { lineTotal } from "@/shared/utils/money";
import type {
  DirectProductSaleRecord,
  ProductSaleLine,
  SaleRecord,
} from "../types";

export function flattenAppointmentProductSales(
  sales: SaleRecord[],
): ProductSaleLine[] {
  const lines: ProductSaleLine[] = [];

  for (const sale of sales) {
    for (const product of sale.products) {
      lines.push({
        id: `appt-${sale.id}-${product.id}-${product.quantity}`,
        source: "appointment",
        paymentId: sale.id,
        directSaleId: null,
        appointmentId: sale.appointmentId,
        paidAt: sale.paidAt,
        productId: product.id,
        productName: product.name,
        quantity: product.quantity,
        unitPrice: product.price,
        lineTotal: lineTotal(product.price, product.quantity),
        customer: { id: sale.customer.id, name: sale.customer.name },
        staff: sale.staff,
        branch: sale.branch,
        originLabel: sale.title,
      });
    }
  }

  return lines;
}

export function flattenDirectProductSales(
  sales: DirectProductSaleRecord[],
): ProductSaleLine[] {
  const lines: ProductSaleLine[] = [];

  for (const sale of sales) {
    for (const product of sale.products) {
      lines.push({
        id: `direct-${sale.id}-${product.id}-${product.quantity}`,
        source: "direct",
        paymentId: null,
        directSaleId: sale.id,
        appointmentId: null,
        paidAt: sale.paidAt,
        productId: product.id,
        productName: product.name,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        lineTotal: lineTotal(product.unitPrice, product.quantity),
        customer: sale.customer
          ? { id: sale.customer.id, name: sale.customer.name }
          : { id: null, name: "Mostrador" },
        staff: sale.staff,
        branch: sale.branch,
        originLabel: "Venta directa",
      });
    }
  }

  return lines;
}

/** @deprecated use flattenAppointmentProductSales */
export function flattenProductSales(sales: SaleRecord[]): ProductSaleLine[] {
  return flattenAppointmentProductSales(sales);
}

export function mergeProductSaleLines(
  appointmentSales: SaleRecord[],
  directSales: DirectProductSaleRecord[],
): ProductSaleLine[] {
  return [
    ...flattenAppointmentProductSales(appointmentSales),
    ...flattenDirectProductSales(directSales),
  ].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );
}

export function summarizeProductSales(lines: ProductSaleLine[]) {
  const totalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);

  const byProduct = new Map<
    number,
    { name: string; units: number; amount: number }
  >();

  for (const line of lines) {
    const current = byProduct.get(line.productId) ?? {
      name: line.productName,
      units: 0,
      amount: 0,
    };
    current.units += line.quantity;
    current.amount += line.lineTotal;
    byProduct.set(line.productId, current);
  }

  const topProduct = [...byProduct.values()].sort((a, b) => b.amount - a.amount)[0] ?? null;

  return { totalAmount, totalUnits, topProduct, lineCount: lines.length };
}

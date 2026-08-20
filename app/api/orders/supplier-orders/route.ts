import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import {
  ORDER_SEVERITY_META,
  supplierOrderSeverity,
} from "@/shared/utils/order-status";
import {
  paymentBuckets,
  splitSupplierInvoiceNumber,
} from "@/shared/utils/invoice-hub";

function parseBound(raw: string | null, endOfDay: boolean) {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
}

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  return { from, to };
}

function formatEmissionDate(d: Date) {
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const fromParam = parseBound(url.searchParams.get("from"), false);
    const toParam = parseBound(url.searchParams.get("to"), true);
    const defaults = defaultRange();
    // Sin from/to → rango por defecto (como hub); si piden all=1, sin filtro de fecha
    const all = url.searchParams.get("all") === "1";
    const from = all ? new Date(2000, 0, 1) : (fromParam ?? defaults.from);
    const to = all ? new Date(2100, 0, 1) : (toParam ?? defaults.to);

    const purchases = await prisma.purchaseOrder.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { not: "cancelado" },
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            identNumber: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        lines: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            discount: true,
            taxRate: true,
            product: { select: { id: true, name: true } },
          },
        },
        payments: {
          select: { amount: true, method: true },
        },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 500,
    });

    const rows = purchases.map((po) => {
      const subtotal = po.lines.reduce(
        (sum, line) =>
          sum + toAmount(line.quantity) * toAmount(line.unitPrice),
        0,
      );
      const discount = po.lines.reduce(
        (sum, line) => sum + toAmount(line.discount),
        0,
      );
      const iva = po.lines.reduce((sum, line) => {
        const base =
          toAmount(line.quantity) * toAmount(line.unitPrice) -
          toAmount(line.discount);
        return sum + base * (toAmount(line.taxRate) / 100);
      }, 0);
      const total = subtotal - discount + iva;

      const severity = supplierOrderSeverity({
        status: po.status,
        receivedAt: po.receivedAt,
        paidAt: po.paidAt,
      });

      let cash = 0;
      let checkBank = 0;
      let card = 0;
      let other = 0;

      if (po.payments.length > 0) {
        for (const p of po.payments) {
          const b = paymentBuckets(p.method, toAmount(p.amount));
          cash += b.cash;
          checkBank += b.checkBank;
          card += b.card;
          other += b.other;
        }
      } else if (po.paidAt) {
        const b = paymentBuckets(po.paymentMethod || "efectivo", total);
        cash = b.cash;
        checkBank = b.checkBank;
        card = b.card;
        other = b.other;
      }

      const inv = splitSupplierInvoiceNumber(
        po.invoiceNumber || `PO-${po.id}`,
      );

      return {
        id: po.id,
        partyKind: "supplier" as const,
        date: po.date.toISOString(),
        dateKey: po.date.toISOString().slice(0, 10),
        emissionDate: formatEmissionDate(po.date),
        estabPtoEmi: inv.estabPtoEmi,
        numero: inv.numero,
        invoiceNumber: inv.invoiceNumber,
        partyName: po.supplier.tradeName?.trim() || po.supplier.name,
        supplierName: po.supplier.tradeName?.trim() || po.supplier.name,
        partyId: po.supplier.id,
        partyIdent: po.supplier.identNumber,
        partyPhone: po.supplier.phone,
        partyEmail: po.supplier.email,
        partyAddress: po.supplier.address,
        status: po.status,
        statusLabel: ORDER_SEVERITY_META[severity].label,
        severity,
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        iva: Number(iva.toFixed(2)),
        tax: Number(iva.toFixed(2)),
        total: Number(total.toFixed(2)),
        retention: 0,
        cash: Number(cash.toFixed(2)),
        checkBank: Number(checkBank.toFixed(2)),
        card: Number(card.toFixed(2)),
        other: Number(other.toFixed(2)),
        paymentMethod: po.paymentMethod,
        notes: po.notes,
        receivedAt: po.receivedAt?.toISOString() ?? null,
        paidAt: po.paidAt?.toISOString() ?? null,
        items: po.lines.map((l) => ({
          name: l.product.name,
          quantity: l.quantity,
          unitPrice: toAmount(l.unitPrice),
          lineTotal: Number(
            (toAmount(l.quantity) * toAmount(l.unitPrice)).toFixed(2),
          ),
        })),
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.total += r.total;
        acc.cash += r.cash;
        acc.checkBank += r.checkBank;
        acc.card += r.card;
        acc.other += r.other;
        acc.retention += r.retention;
        return acc;
      },
      {
        count: 0,
        total: 0,
        cash: 0,
        checkBank: 0,
        card: 0,
        other: 0,
        retention: 0,
      },
    );

    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      rows,
      totals: {
        count: totals.count,
        total: Number(totals.total.toFixed(2)),
        cash: Number(totals.cash.toFixed(2)),
        checkBank: Number(totals.checkBank.toFixed(2)),
        card: Number(totals.card.toFixed(2)),
        other: Number(totals.other.toFixed(2)),
        retention: Number(totals.retention.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("GET /api/orders/supplier-orders", error);
    return NextResponse.json(
      { message: "Error al obtener compras" },
      { status: 500 },
    );
  }
}

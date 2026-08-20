import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import {
  customerOrderSeverity,
  supplierOrderSeverity,
  lineTotal,
} from "@/shared/utils/order-status";

function monthBounds(ym: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  const now = new Date();
  const year = m ? Number(m[1]) : now.getFullYear();
  const month = m ? Number(m[2]) - 1 : now.getMonth();
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  // Incluir mes anterior (como EdDeli) para pedidos que cruzan
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return { start, end, from, year, month };
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const month = url.searchParams.get("month") ?? "";
    const { start, end, from } = monthBounds(month);

    const [sales, purchases] = await Promise.all([
      prisma.sale.findMany({
        where: {
          date: { gte: from, lte: end },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              firstLastName: true,
              secondLastName: true,
            },
          },
          lines: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
          installments: {
            select: { id: true, dueDate: true, amount: true },
          },
        },
        orderBy: [{ date: "asc" }, { id: "asc" }],
      }),
      prisma.purchaseOrder.findMany({
        where: {
          date: { gte: from, lte: end },
          status: { not: "cancelado" },
        },
        include: {
          supplier: { select: { id: true, name: true, tradeName: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ date: "asc" }, { id: "asc" }],
      }),
    ]);

    const customerOrders = sales
      .filter((sale) => {
        const name = [
          sale.customer.name,
          sale.customer.firstLastName,
          sale.customer.secondLastName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        // Pedidos: no mostrar ventas de mostrador / Consumidor Final ni CAJA_POS
        if (name.includes("consumidor final")) return false;
        const notes = String(sale.notes ?? "").toUpperCase();
        if (notes.includes("[CAJA_POS]")) return false;
        return true;
      })
      .map((sale) => {
        const partyName = [
          sale.customer.name,
          sale.customer.firstLastName,
          sale.customer.secondLastName,
        ]
          .filter(Boolean)
          .join(" ");
        const total = sale.lines.reduce(
          (sum, line) => sum + lineTotal(line.quantity, line.price),
          0,
        );
        const pendingInstallments = sale.installments.filter(
          (i) => !sale.paidAt && i.dueDate,
        );
        const hasCreditDue = pendingInstallments.length > 0;
        const severity = customerOrderSeverity({
          status: sale.status,
          paidAt: sale.paidAt,
          lines: sale.lines,
          installmentsPending: hasCreditDue,
        });

        const lineCount = sale.lines.length || 1;
        const paidLines = sale.lines.filter((l) => l.paidAt).length;
        const deliveredLines = sale.lines.filter((l) => l.deliveredAt).length;
        const paidPct =
          sale.status === "pagado" || sale.paidAt
            ? 100
            : Math.round((paidLines / lineCount) * 100);
        const deliveredPct =
          sale.status === "entregado" ||
          (sale.status === "pagado" && deliveredLines === lineCount)
            ? Math.max(
                Math.round((deliveredLines / lineCount) * 100),
                sale.status === "entregado" ? 100 : 0,
              )
            : Math.round((deliveredLines / lineCount) * 100);

      return {
        id: sale.id,
        orderKind: "customer" as const,
        date: sale.date.toISOString(),
        dateKey: dateKey(sale.date),
        status: sale.status,
        severity,
        hasCreditDue,
        partyName,
        total,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes,
        invoiceNumber:
          sale.documentType &&
          sale.documentType !== "documento" &&
          sale.documentType !== "factura"
            ? sale.documentType
            : null,
        paidPct,
        deliveredPct,
          statusLabel:
            severity === 3
              ? "Cobrado"
              : severity === 1
                ? "Entregado · falta cobro"
                : severity === 2
                  ? "Cobrado · falta entrega"
                  : "Sin avance",
          itemsSummary: sale.lines
            .map((l) =>
              l.quantity > 1
                ? `${l.product.name} ×${l.quantity}`
                : l.product.name,
            )
            .join(", "),
          items: sale.lines.map((l) => ({
            id: l.id,
            name: l.product.name,
            quantity: l.quantity,
            price: toAmount(l.price),
            paidAt: l.paidAt?.toISOString() ?? null,
            deliveredAt: l.deliveredAt?.toISOString() ?? null,
          })),
        };
      });

    const supplierOrders = purchases.map((po) => {
      const total = po.lines.reduce(
        (sum, line) => sum + lineTotal(line.quantity, line.unitPrice),
        0,
      );
      const severity = supplierOrderSeverity({
        status: po.status,
        receivedAt: po.receivedAt,
        paidAt: po.paidAt,
      });
      const partyName =
        po.supplier.tradeName?.trim() || po.supplier.name;

      return {
        id: po.id,
        orderKind: "supplier" as const,
        date: po.date.toISOString(),
        dateKey: dateKey(po.date),
        status: po.status,
        severity,
        hasCreditDue: false,
        partyName,
        total,
        paymentMethod: po.paymentMethod,
        notes: po.notes,
        invoiceNumber: po.invoiceNumber,
        paidPct: po.paidAt ? 100 : 0,
        deliveredPct: po.receivedAt || po.status === "recibido" ? 100 : 0,
        statusLabel:
          severity === 3
            ? "Completo"
            : severity === 1
              ? "Recibido · falta pago"
              : severity === 2
                ? "Pagado · falta recepción"
                : "Sin avance",
        itemsSummary: po.lines
          .map((l) =>
            l.quantity > 1
              ? `${l.product.name} ×${l.quantity}`
              : l.product.name,
          )
          .join(", "),
        items: po.lines.map((l) => ({
          id: l.id,
          name: l.product.name,
          quantity: l.quantity,
          price: toAmount(l.unitPrice),
          paidAt: po.paidAt?.toISOString() ?? null,
          deliveredAt: po.receivedAt?.toISOString() ?? null,
        })),
      };
    });

    const orders = [...customerOrders, ...supplierOrders].sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id,
    );

    return NextResponse.json({
      from: from.toISOString(),
      to: end.toISOString(),
      monthStart: start.toISOString(),
      monthEnd: end.toISOString(),
      orders,
    });
  } catch (error) {
    console.error("GET /api/orders/calendar", error);
    return NextResponse.json(
      { message: "Error al cargar calendario de pedidos" },
      { status: 500 },
    );
  }
}

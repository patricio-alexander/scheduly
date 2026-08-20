import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import {
  customerOrderSeverity,
  ORDER_SEVERITY_META,
} from "@/shared/utils/order-status";
import { paymentBuckets } from "@/shared/utils/invoice-hub";

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
  return d.toLocaleString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const SRI_STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  signed: "Firmado",
  received: "Recibido",
  authorized: "Autorizado",
  rejected: "Rechazado",
  cancelled: "Anulado",
};

function environmentLabel(env: string | null | undefined) {
  const raw = String(env || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (raw === "produccion" || raw === "2") return "PRODUCCIÓN";
  if (raw === "pruebas" || raw === "1") return "PRUEBAS";
  return "—";
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    const fromParam = parseBound(fromRaw, false);
    const toParam = parseBound(toRaw, true);
    const hasDateFilter = Boolean(fromRaw || toRaw);
    const defaults = defaultRange();
    const from = hasDateFilter ? (fromParam ?? defaults.from) : null;
    const to = hasDateFilter ? (toParam ?? defaults.to) : null;
    const limit = Math.min(
      1000,
      Math.max(1, Number(url.searchParams.get("limit") || 500) || 500),
    );

    const sales = await prisma.sale.findMany({
      where: from && to
        ? {
            OR: [
              { paidAt: { gte: from, lte: to } },
              { paidAt: null, date: { gte: from, lte: to } },
            ],
          }
        : undefined,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            firstLastName: true,
            secondLastName: true,
            cedula: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        seller: { select: { id: true, username: true } },
        cashRegister: {
          select: {
            emissionPointCode: true,
            branch: { select: { establishmentCode: true } },
          },
        },
        electronicInvoices: {
          orderBy: { id: "desc" },
          take: 1,
          select: {
            establishmentCode: true,
            emissionPointCode: true,
            sequential: true,
            subtotal: true,
            ivaAmount: true,
            iceTotal: true,
            total: true,
            environment: true,
            status: true,
            accessKey: true,
            authorizationNumber: true,
            authorizationDate: true,
            buyerName: true,
          },
        },
        lines: {
          select: {
            id: true,
            quantity: true,
            price: true,
            paidAt: true,
            deliveredAt: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: limit,
    });

    const rows = sales.map((sale) => {
      const lineTotal = sale.lines.reduce(
        (sum, line) => sum + toAmount(line.quantity) * toAmount(line.price),
        0,
      );
      const inv = sale.electronicInvoices[0];
      const subtotal = inv ? toAmount(inv.subtotal) || lineTotal : lineTotal;
      const iva = inv ? toAmount(inv.ivaAmount) : 0;
      const ice = inv ? toAmount(inv.iceTotal) : 0;
      const total = inv ? toAmount(inv.total) || lineTotal : lineTotal;
      const isPaid = Boolean(sale.paidAt) || sale.status === "pagado";
      const buckets = paymentBuckets(
        sale.paymentMethod || (isPaid ? "efectivo" : "other"),
        isPaid ? total : 0,
      );
      const paidBuckets = isPaid
        ? buckets
        : { cash: 0, checkBank: 0, card: 0, other: 0 };

      const severity = customerOrderSeverity({
        status: sale.status,
        paidAt: sale.paidAt,
        lines: sale.lines,
      });
      const at = sale.paidAt ?? sale.date;
      const customerName = [
        sale.customer.name,
        sale.customer.firstLastName,
        sale.customer.secondLastName,
      ]
        .filter(Boolean)
        .join(" ");

      const estab =
        inv?.establishmentCode ||
        sale.cashRegister?.branch?.establishmentCode ||
        "001";
      const pto =
        inv?.emissionPointCode ||
        sale.cashRegister?.emissionPointCode ||
        "001";
      const sequentialLabel = inv?.sequential
        ? String(inv.sequential).padStart(9, "0")
        : "—";
      const numero = inv?.sequential
        ? String(inv.sequential).padStart(9, "0")
        : String(sale.id).padStart(9, "0");
      const env = inv?.environment || "";
      const sriStatusLabel = inv
        ? SRI_STATUS_LABEL[inv.status] || inv.status
        : "Sin SRI";

      return {
        id: sale.id,
        partyKind: "customer" as const,
        date: at.toISOString(),
        dateKey: at.toISOString().slice(0, 10),
        paidAt: sale.paidAt?.toISOString() ?? null,
        emissionDate: formatEmissionDate(at),
        estabPtoEmi: `${estab}-${pto}`,
        numero,
        invoiceNumber: null as string | null,
        documentType: sale.documentType || "documento",
        sellerLabel: sale.seller?.username ?? "—",
        sellerName: sale.seller?.username ?? "—",
        partyName: customerName,
        customerName,
        customer: {
          id: sale.customer.id,
          name: customerName,
        },
        partyId: sale.customer.id,
        partyIdent: sale.customer.cedula,
        partyPhone: sale.customer.phone,
        partyEmail: sale.customer.email,
        partyAddress: sale.customer.address,
        status: sale.status,
        statusLabel: ORDER_SEVERITY_META[severity].label,
        severity,
        subtotal,
        discount: 0,
        ice,
        iva,
        tax: iva,
        total,
        retention: 0,
        cash: paidBuckets.cash,
        checkBank: paidBuckets.checkBank,
        card: paidBuckets.card,
        other: paidBuckets.other,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes,
        sri: inv
          ? {
              estabPtoEmi: `${estab}-${pto}`,
              sequential: inv.sequential,
              sequentialLabel,
              environment: env,
              environmentLabel: environmentLabel(env),
              status: inv.status,
              statusLabel: sriStatusLabel,
              accessKey: inv.accessKey,
              authorizationNumber: inv.authorizationNumber,
              authorizedAt: inv.authorizationDate?.toISOString() ?? null,
              customerName: inv.buyerName || customerName,
            }
          : {
              estabPtoEmi: `${estab}-${pto}`,
              sequential: null,
              sequentialLabel: "—",
              environment: "",
              environmentLabel: "—",
              status: null,
              statusLabel: "Sin SRI",
              accessKey: null,
              authorizationNumber: null,
              authorizedAt: null,
              customerName,
            },
        items: sale.lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          quantity: l.quantity,
          unitPrice: toAmount(l.price),
          price: toAmount(l.price),
          lineTotal: Number(
            (toAmount(l.quantity) * toAmount(l.price)).toFixed(2),
          ),
        })),
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.total += r.total;
        acc.subtotal += r.subtotal;
        acc.ice += r.ice;
        acc.iva += r.iva;
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
        subtotal: 0,
        ice: 0,
        iva: 0,
        cash: 0,
        checkBank: 0,
        card: 0,
        other: 0,
        retention: 0,
      },
    );

    return NextResponse.json({
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      data: rows,
      rows,
      totals: {
        count: totals.count,
        total: Number(totals.total.toFixed(2)),
        subtotal: Number(totals.subtotal.toFixed(2)),
        ice: Number(totals.ice.toFixed(2)),
        iva: Number(totals.iva.toFixed(2)),
        cash: Number(totals.cash.toFixed(2)),
        checkBank: Number(totals.checkBank.toFixed(2)),
        card: Number(totals.card.toFixed(2)),
        other: Number(totals.other.toFixed(2)),
        retention: Number(totals.retention.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("GET /api/orders/pos-sales", error);
    return NextResponse.json(
      { message: "Error al obtener ventas" },
      { status: 500 },
    );
  }
}

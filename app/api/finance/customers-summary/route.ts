import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import { saleWhereForLocation, linesForLocation } from "@/shared/utils/pos-location";
import { isPaidSale, saleLineTotal } from "@/shared/utils/dashboard-eddeli-metrics";

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const scope = await resolveDashboardScope(prisma, auth.user, requestedBranchId);
    const branchId = scope.branchId;

    const sales = await prisma.sale.findMany({
      where: saleWhereForLocation(branchId),
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            firstLastName: true,
            secondLastName: true,
            phone: true,
            email: true,
          },
        },
        lines: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: "desc" },
      take: 5000,
    });

    type LineAgg = {
      kind: "service" | "product";
      id: number;
      name: string;
      totalQuantity: number;
      totalAmount: number;
      pendingQuantity: number;
      pendingAmount: number;
    };

    type CustAgg = {
      customerId: number;
      customer: {
        name: string;
        phone: string;
        email: string;
      };
      ordersCount: number;
      revenueTotal: number;
      cobrable: number;
      /** Pagado/liquidado: cobrado en turnos sin saldo pendiente. */
      liquidado: number;
      /** Abonado: pagos parciales con deuda aún abierta. */
      abonado: number;
      /** No pagado: saldo pendiente. */
      debe: number;
      lastOrderAt: string | null;
      lineItems: Map<string, LineAgg>;
    };

    const byCustomer = new Map<number, CustAgg>();

    for (const sale of sales) {
      const c = sale.customer;
      const lines = linesForLocation(sale.lines, branchId);
      const catalog = lines.reduce((sum, line) => sum + saleLineTotal(line), 0);
      const paid = isPaidSale(sale) ? catalog : 0;
      const pending = isPaidSale(sale) ? 0 : catalog;

      const current = byCustomer.get(c.id) ?? {
        customerId: c.id,
        customer: {
          name: [c.name, c.firstLastName, c.secondLastName].filter(Boolean).join(" "),
          phone: c.phone ?? "",
          email: c.email ?? "",
        },
        ordersCount: 0,
        revenueTotal: 0,
        cobrable: 0,
        liquidado: 0,
        abonado: 0,
        debe: 0,
        lastOrderAt: null,
        lineItems: new Map(),
      };

      current.ordersCount += 1;
      current.revenueTotal += catalog;
      current.cobrable += catalog;
      current.debe += pending;
      if (pending > 0) current.abonado += paid;
      else current.liquidado += catalog;

      const iso = (sale.paidAt ?? sale.date).toISOString();
      if (!current.lastOrderAt || iso > current.lastOrderAt) {
        current.lastOrderAt = iso;
      }

      const bumpLine = (
        kind: "service" | "product",
        id: number,
        name: string,
        quantity: number,
        amount: number,
      ) => {
        const key = `${kind}:${id}`;
        const agg = current.lineItems.get(key) ?? {
          kind,
          id,
          name,
          totalQuantity: 0,
          totalAmount: 0,
          pendingQuantity: 0,
          pendingAmount: 0,
        };
        agg.totalQuantity += quantity;
        agg.totalAmount += amount;
        if (pending > 0 && catalog > 0) {
          const share = amount / catalog;
          agg.pendingAmount += pending * share;
          agg.pendingQuantity += quantity * (pending / catalog);
        }
        current.lineItems.set(key, agg);
      };

      for (const line of lines) {
        bumpLine(
          "product",
          line.product.id,
          line.product.name,
          line.quantity,
          saleLineTotal(line),
        );
      }

      byCustomer.set(c.id, current);
    }

    const rows = [...byCustomer.values()]
      .map((c) => {
        const items = [...c.lineItems.values()]
          .map((item) => ({
            ...item,
            totalAmount: toAmount(item.totalAmount),
            pendingAmount: toAmount(item.pendingAmount),
            pendingQuantity: Number(item.pendingQuantity.toFixed(2)),
          }))
          .sort((a, b) => b.totalAmount - a.totalAmount);

        return {
          customerId: c.customerId,
          customer: c.customer,
          ordersCount: c.ordersCount,
          revenueTotal: toAmount(c.revenueTotal),
          cobrable: toAmount(c.cobrable),
          liquidado: toAmount(c.liquidado),
          abonado: toAmount(c.abonado),
          debe: toAmount(c.debe),
          lastOrderAt: c.lastOrderAt,
          // Compatibilidad con clientes que aún lean productSummary
          productSummary: items
            .filter((item) => item.kind === "product")
            .map(({ kind: _kind, ...rest }) => ({
              productId: rest.id,
              name: rest.name,
              totalQuantity: rest.totalQuantity,
              totalAmount: rest.totalAmount,
              pendingQuantity: rest.pendingQuantity,
              pendingAmount: rest.pendingAmount,
            })),
          itemsSummary: items,
        };
      })
      .sort((a, b) => b.revenueTotal - a.revenueTotal);

    return NextResponse.json({ customers: rows });
  } catch (error) {
    console.error("GET /api/finance/customers-summary", error);
    return NextResponse.json(
      { message: "Error al cargar clientes" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import { appointmentPaidAmount } from "@/shared/utils/finance-revenue";

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

    const appointments = await prisma.appointment.findMany({
      where: branchId ? { branchId } : {},
      include: {
        customer: {
          select: { id: true, name: true, lastnames: true, phone: true, email: true },
        },
        payment: true,
        services: {
          include: { service: { select: { id: true, name: true, price: true } } },
        },
        products: {
          include: {
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: { appointmentDate: "desc" },
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

    for (const apt of appointments) {
      const c = apt.customer;
      const current = byCustomer.get(c.id) ?? {
        customerId: c.id,
        customer: {
          name: `${c.name} ${c.lastnames}`.trim(),
          phone: c.phone,
          email: c.email,
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
      const catalog =
        apt.services.reduce((s, row) => s + toAmount(row.service.price), 0) +
        apt.products.reduce(
          (s, row) => s + toAmount(row.product.price) * row.quantity,
          0,
        );
      const paid = appointmentPaidAmount(apt);
      const pending =
        apt.status === "pending_payment" || apt.status === "scheduled"
          ? Math.max(0, catalog - paid)
          : apt.status === "completed"
            ? 0
            : Math.max(0, catalog - paid);

      current.revenueTotal += catalog;
      current.cobrable += catalog;
      current.debe += pending;

      // Verde = pagado (sin deuda). Azul = abono parcial. Rojo = no pagado.
      if (pending > 0) {
        current.abonado += paid;
      } else {
        current.liquidado += Math.max(paid, catalog > 0 ? catalog : paid);
      }

      const iso = apt.appointmentDate.toISOString();
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

      for (const row of apt.products) {
        const p = row.product;
        bumpLine(
          "product",
          p.id,
          p.name,
          row.quantity,
          toAmount(p.price) * row.quantity,
        );
      }

      for (const row of apt.services) {
        const s = row.service;
        bumpLine("service", s.id, s.name, 1, toAmount(s.price));
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

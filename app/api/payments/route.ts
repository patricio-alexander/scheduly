import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { toAmount } from "@/shared/utils/money";
import {
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  calcAppointmentCommission,
  DEFAULT_COMMISSION_PCT,
} from "@/shared/utils/commissions";

function parseMethod(value: string | null): PaymentMethodValue | null {
  if (!value) return null;
  return (paymentMethodOptions as readonly string[]).includes(value)
    ? (value as PaymentMethodValue)
    : null;
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const period = parseDashboardPeriod(url.searchParams.get("period"));
    const method = parseMethod(url.searchParams.get("method"));
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const { start, end } = getDashboardPeriodRange(period);

    const payments = await prisma.payment.findMany({
      where: {
        paidAt: { gte: start, lte: end },
        ...(method ? { method } : {}),
      },
      include: {
        appointment: {
          include: {
            customer: {
              select: { id: true, name: true, lastnames: true },
            },
            user: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
            services: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    commissionPct: true,
                  },
                },
              },
            },
            products: {
              include: {
                product: { select: { id: true, name: true, price: true } },
              },
            },
            commission: {
              select: { amount: true, ratePct: true, baseAmount: true },
            },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 200,
    });

    const sales = payments
      .map((payment) => {
        const services = payment.appointment.services.map((s) => ({
          id: s.service.id,
          name: s.service.name,
          price: toAmount(s.service.price),
          commissionPct:
            toAmount(s.service.commissionPct) || DEFAULT_COMMISSION_PCT,
        }));
        const products = payment.appointment.products.map((p) => ({
          id: p.product.id,
          name: p.product.name,
          price: toAmount(p.product.price),
          quantity: p.quantity,
        }));
        const amount = toAmount(payment.amount);
        const storedCommission = payment.appointment.commission;
        const commission = storedCommission
          ? {
              amount: toAmount(storedCommission.amount),
              ratePct: toAmount(storedCommission.ratePct),
              baseAmount: toAmount(storedCommission.baseAmount),
            }
          : (() => {
              const calculated = calcAppointmentCommission(
                payment.appointment.services,
                payment.appointment.products,
                amount,
              );
              return calculated.amount > 0
                ? {
                    amount: calculated.amount,
                    ratePct: calculated.ratePct,
                    baseAmount: calculated.baseAmount,
                  }
                : null;
            })();
        const itemsSummary = [
          ...services.map((s) => s.name),
          ...products.map((p) =>
            p.quantity > 1 ? `${p.name} ×${p.quantity}` : p.name,
          ),
        ].join(", ");

        return {
          id: payment.id,
          appointmentId: payment.appointmentId,
          amount,
          method: payment.method,
          paidAt: payment.paidAt.toISOString(),
          notes: payment.notes,
          commission,
          customer: {
            id: payment.appointment.customer.id,
            name: `${payment.appointment.customer.name} ${payment.appointment.customer.lastnames}`.trim(),
          },
          staff: {
            id: payment.appointment.user.id,
            name: payment.appointment.user.name,
          },
          branch: payment.appointment.branch
            ? {
                id: payment.appointment.branch.id,
                name: payment.appointment.branch.name,
              }
            : null,
          title: payment.appointment.title,
          description: payment.appointment.description,
          status: payment.appointment.status,
          appointmentDate: payment.appointment.appointmentDate.toISOString(),
          services,
          products,
          itemsSummary,
        };
      })
      .filter((sale) => {
        if (!q) return true;
        return (
          sale.customer.name.toLowerCase().includes(q) ||
          sale.staff.name.toLowerCase().includes(q) ||
          sale.title.toLowerCase().includes(q) ||
          sale.itemsSummary.toLowerCase().includes(q) ||
          sale.notes.toLowerCase().includes(q)
        );
      });

    const totalAmount = sales.reduce((sum, s) => sum + s.amount, 0);
    const byMethod = paymentMethodOptions.map((m) => ({
      method: m,
      count: sales.filter((s) => s.method === m).length,
      amount: sales
        .filter((s) => s.method === m)
        .reduce((sum, s) => sum + s.amount, 0),
    }));

    return NextResponse.json({
      period,
      totalCount: sales.length,
      totalAmount,
      byMethod,
      sales,
    });
  } catch (error) {
    console.error("GET /api/payments", error);
    return NextResponse.json(
      { message: "Error al obtener ventas" },
      { status: 500 },
    );
  }
}

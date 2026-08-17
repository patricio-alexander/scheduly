import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import { reconcileCommissionSettlementsForUser } from "@/shared/utils/commissions";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    await reconcileCommissionSettlementsForUser(prisma, auth.user.id);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfDay);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const [
      todayAppointments,
      weekAppointments,
      pendingCommissionAgg,
      pendingCommissions,
      salaryPayments,
      branchStocks,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          userId: auth.user.id,
          appointmentDate: { gte: startOfDay, lte: endOfWeek },
        },
        include: {
          customer: { select: { name: true, lastnames: true } },
          branch: { select: { name: true } },
          services: { include: { service: { select: { name: true } } } },
        },
        orderBy: { appointmentDate: "asc" },
      }),
      prisma.appointment.count({
        where: {
          userId: auth.user.id,
          appointmentDate: { gte: startOfDay, lte: endOfWeek },
        },
      }),
      prisma.commissionRecord.aggregate({
        where: { userId: auth.user.id, settledAt: null },
        _sum: { amount: true },
      }),
      prisma.commissionRecord.findMany({
        where: { userId: auth.user.id, settledAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          appointment: {
            select: { title: true, appointmentDate: true },
          },
        },
      }),
      prisma.employeePayment.findMany({
        where: { userId: auth.user.id },
        orderBy: { paidAt: "desc" },
        take: 20,
        include: {
          registeredBy: { select: { name: true } },
          branch: { select: { name: true } },
        },
      }),
      prisma.branchStock.findMany({
        where: {
          stock: { gt: 0 },
          branch: {
            users: { some: { userId: auth.user.id } },
          },
        },
        include: {
          product: { select: { id: true, name: true, price: true } },
          branch: { select: { id: true, name: true } },
        },
        take: 50,
      }),
    ]);

    const commissionTotal = toAmount(pendingCommissionAgg._sum.amount ?? 0);
    const paidTotal = salaryPayments.reduce(
      (sum, payment) => sum + toAmount(payment.amount),
      0,
    );

    return NextResponse.json({
      user: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
      todayAppointments: todayAppointments.map((apt) => ({
        id: apt.id,
        title: apt.title,
        status: apt.status,
        date: apt.appointmentDate.toISOString(),
        customer: `${apt.customer.name} ${apt.customer.lastnames}`.trim(),
        branch: apt.branch?.name ?? null,
        services: apt.services.map((s) => s.service.name).join(", "),
      })),
      weekAppointments,
      commissionTotal,
      paidTotal,
      commissions: pendingCommissions.map((c) => ({
        id: c.id,
        amount: toAmount(c.amount),
        ratePct: c.ratePct,
        createdAt: c.createdAt.toISOString(),
        title: c.appointment.title,
        appointmentDate: c.appointment.appointmentDate.toISOString(),
      })),
      salaryPayments: salaryPayments.map((payment) => ({
        id: payment.id,
        amount: toAmount(payment.amount),
        method: payment.method,
        paidAt: payment.paidAt.toISOString(),
        notes: payment.notes,
        branch: payment.branch?.name ?? null,
        registeredBy: payment.registeredBy.name,
      })),
      stock: branchStocks.map((row) => ({
        productId: row.product.id,
        productName: row.product.name,
        branchName: row.branch.name,
        stock: row.stock,
      })),
    });
  } catch (error) {
    console.error("GET /api/employee/me", error);
    return NextResponse.json({ message: "Error al cargar datos del empleado" }, { status: 500 });
  }
}

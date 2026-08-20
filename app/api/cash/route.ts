import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const [registers, openShifts, todaySales] = await Promise.all([
      prisma.cashRegister.findMany({
        where: { isActive: true },
        include: {
          branch: { select: { id: true, name: true } },
        },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      }),
      prisma.cashShift.findMany({
        where: { status: "open" },
        include: {
          branch: { select: { id: true, name: true } },
          cashRegister: { select: { id: true, name: true } },
          person: {
            select: { id: true, firstName: true, firstLastName: true },
          },
        },
        orderBy: { openedAt: "desc" },
        take: 20,
      }),
      prisma.sale.findMany({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              firstLastName: true,
            },
          },
          lines: { select: { quantity: true, price: true } },
        },
        orderBy: { date: "desc" },
        take: 40,
      }),
    ]);

    const shifts = openShifts.map((s) => ({
      id: s.id,
      status: s.status,
      openedAt: s.openedAt.toISOString(),
      openingCashTotal: s.openingCashTotal,
      storeId: s.storeId,
      branch: s.branch,
      cashRegister: s.cashRegister,
      cashier: s.person
        ? [s.person.firstName, s.person.firstLastName].filter(Boolean).join(" ")
        : "—",
    }));

    const sales = todaySales.map((sale) => {
      const total = sale.lines.reduce(
        (sum, line) => sum + toAmount(line.quantity) * toAmount(line.price),
        0,
      );
      return {
        id: sale.id,
        status: sale.status,
        date: sale.date.toISOString(),
        paymentMethod: sale.paymentMethod,
        total,
        customer: {
          id: sale.customer.id,
          name: [sale.customer.name, sale.customer.firstLastName]
            .filter(Boolean)
            .join(" "),
        },
      };
    });

    const todayTotal = sales.reduce((sum, s) => sum + s.total, 0);

    return NextResponse.json({
      registers: registers.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        storeId: r.storeId,
        branch: r.branch,
      })),
      openShifts: shifts,
      todaySales: sales,
      todayTotal,
      todayCount: sales.length,
    });
  } catch (error) {
    console.error("GET /api/cash", error);
    return NextResponse.json(
      { message: "Error al obtener estado de caja" },
      { status: 500 },
    );
  }
}

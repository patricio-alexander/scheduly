import "dotenv/config";
import { prisma } from "../shared/utils/prisma";
import { resolveDashboardScope } from "../shared/utils/branches";
import { fetchOwnerInsights } from "../shared/utils/dashboard-owner-insights";

async function main() {
  try {
    const scope = await resolveDashboardScope(
      prisma,
      { id: 1, role: "owner" },
      null,
    );
    console.log("scope", scope);
  } catch (e) {
    console.error("scope err", e instanceof Error ? e.message : e);
  }

  try {
    await prisma.appointment.findMany({
      where: { status: "completed" },
      take: 1,
      include: {
        payment: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            firstLastName: true,
            secondName: true,
            secondLastName: true,
          },
        },
        services: {
          include: {
            service: { select: { id: true, name: true, price: true } },
          },
        },
        products: { include: { product: { select: { price: true } } } },
      },
    });
    console.log("appointment include ok");
  } catch (e) {
    console.error(
      "apt err",
      e instanceof Error ? e.message.slice(0, 500) : e,
    );
  }

  try {
    await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    });
    console.log("branch ok");
  } catch (e) {
    console.error(
      "branch err",
      e instanceof Error ? e.message.slice(0, 400) : e,
    );
  }

  try {
    const insights = await fetchOwnerInsights({
      start: new Date("2026-08-01"),
      end: new Date("2026-08-31"),
      prevStart: new Date("2026-07-01"),
      prevEnd: new Date("2026-07-31"),
      branchId: null,
      revenue: 0,
      previousRevenue: 0,
      completed: 0,
      prevCompleted: 0,
      totalAppointments: 0,
      cancelled: 0,
    });
    console.log("insights ok", Object.keys(insights));
  } catch (e) {
    console.error(
      "insights err",
      e instanceof Error ? e.message.slice(0, 1000) : e,
    );
  }

  await prisma.$disconnect();
}

main();

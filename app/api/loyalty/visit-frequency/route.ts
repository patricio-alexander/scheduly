import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

/**
 * Clientes por frecuencia de visita (citas completadas/pagadas).
 * Sugiere promoción, descuento o regalo según hábito.
 */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const now = new Date();
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        firstLastName: true,
        secondLastName: true,
        phone: true,
        email: true,
        loyalty: { select: { points: true, tier: true } },
        appointments: {
          where: {
            appointmentDate: { gte: yearAgo },
            status: { in: ["completed", "paid_pending"] },
          },
          select: { appointmentDate: true, status: true },
          orderBy: { appointmentDate: "desc" },
          take: 40,
        },
      },
      take: 500,
      orderBy: { name: "asc" },
    });

    const rows = customers
      .map((c) => {
        const dates = c.appointments
          .map((a) => a.appointmentDate.getTime())
          .sort((a, b) => b - a);
        const visitCount = dates.length;
        const lastVisitAt = dates[0] ? new Date(dates[0]).toISOString() : null;
        const daysSinceLast = dates[0]
          ? Math.floor((now.getTime() - dates[0]) / 86_400_000)
          : null;

        let avgDaysBetween: number | null = null;
        if (dates.length >= 2) {
          const gaps: number[] = [];
          for (let i = 0; i < dates.length - 1; i++) {
            gaps.push((dates[i] - dates[i + 1]) / 86_400_000);
          }
          avgDaysBetween =
            Math.round(
              (gaps.reduce((s, g) => s + g, 0) / gaps.length) * 10,
            ) / 10;
        }

        let suggestion: "gift" | "promo" | "discount" | "reactivate" | "ok" =
          "ok";
        let suggestionLabel = "Cliente estable";

        if (visitCount === 0) {
          suggestion = "promo";
          suggestionLabel = "Sin visitas recientes · ofrecer promo de bienvenida";
        } else if (daysSinceLast != null && daysSinceLast >= 45) {
          suggestion = "reactivate";
          suggestionLabel = `Inactivo ${daysSinceLast} días · reactivar con descuento`;
        } else if (
          avgDaysBetween != null &&
          avgDaysBetween <= 14 &&
          visitCount >= 4
        ) {
          suggestion = "gift";
          suggestionLabel = `Viene cada ~${avgDaysBetween} días · candidato a regalo/premio`;
        } else if (
          avgDaysBetween != null &&
          avgDaysBetween <= 21 &&
          visitCount >= 3
        ) {
          suggestion = "discount";
          suggestionLabel = `Frecuente (~${avgDaysBetween} días) · descuento fidelidad`;
        } else if (visitCount >= 2) {
          suggestion = "promo";
          suggestionLabel = "Oferta del período para mantener el hábito";
        }

        const lastnames = [c.firstLastName, c.secondLastName]
          .filter(Boolean)
          .join(" ");

        return {
          id: c.id,
          name: c.name,
          lastnames,
          phone: c.phone,
          email: c.email,
          points: c.loyalty?.points ?? 0,
          tier: c.loyalty?.tier ?? "bronze",
          visitCount,
          lastVisitAt,
          daysSinceLast,
          avgDaysBetween,
          suggestion,
          suggestionLabel,
        };
      })
      .filter((r) => r.visitCount > 0 || r.suggestion !== "ok")
      .sort((a, b) => {
        const rank = (s: string) =>
          s === "reactivate"
            ? 0
            : s === "gift"
              ? 1
              : s === "discount"
                ? 2
                : s === "promo"
                  ? 3
                  : 4;
        return rank(a.suggestion) - rank(b.suggestion) || b.visitCount - a.visitCount;
      });

    return NextResponse.json({ customers: rows });
  } catch (error) {
    console.error("GET /api/loyalty/visit-frequency", error);
    return NextResponse.json(
      { message: "Error al analizar frecuencia" },
      { status: 500 },
    );
  }
}

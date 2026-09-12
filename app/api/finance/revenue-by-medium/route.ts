import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole, isOwnerRole } from "@/shared/utils/roles";
import { parseDateKey, toDateKey } from "@/shared/utils/payroll-settings";
import { revenueByMediumSummary } from "@/shared/utils/cash-close-suggest";

/**
 * GET /api/finance/revenue-by-medium
 * Dueña/admin: desglose real de cobros por medio (De Una, Loja, Pichincha…).
 * ?date=YYYY-MM-DD | ?from=&to= | ?branchId=
 */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const dateKey = url.searchParams.get("date");
    const fromKey = url.searchParams.get("from");
    const toKey = url.searchParams.get("to");
    const branchRaw = url.searchParams.get("branchId");
    const branchId =
      branchRaw != null && branchRaw !== "" ? Number(branchRaw) : null;

    if (branchId != null && (!Number.isInteger(branchId) || branchId <= 0)) {
      return NextResponse.json({ message: "Sucursal inválida" }, { status: 400 });
    }
    if (!isOwnerRole(auth.user.role) && branchId == null) {
      // admins suelen filtrar por su local; dueña puede ver todo
    }

    let from: Date;
    let to: Date;
    if (dateKey) {
      const d = parseDateKey(dateKey);
      if (!d) {
        return NextResponse.json({ message: "Fecha inválida" }, { status: 400 });
      }
      from = new Date(d);
      from.setHours(0, 0, 0, 0);
      to = new Date(d);
      to.setHours(23, 59, 59, 999);
    } else if (fromKey && toKey) {
      const f = parseDateKey(fromKey);
      const t = parseDateKey(toKey);
      if (!f || !t) {
        return NextResponse.json({ message: "Rango inválido" }, { status: 400 });
      }
      from = new Date(f);
      from.setHours(0, 0, 0, 0);
      to = new Date(t);
      to.setHours(23, 59, 59, 999);
    } else {
      const today = parseDateKey(toDateKey(new Date()))!;
      from = new Date(today);
      from.setHours(0, 0, 0, 0);
      to = new Date(today);
      to.setHours(23, 59, 59, 999);
    }

    const summary = await revenueByMediumSummary({
      from,
      to,
      branchId:
        branchId != null && Number.isInteger(branchId) ? branchId : null,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/finance/revenue-by-medium", error);
    return NextResponse.json(
      { message: "Error al obtener desglose por medio" },
      { status: 500 },
    );
  }
}

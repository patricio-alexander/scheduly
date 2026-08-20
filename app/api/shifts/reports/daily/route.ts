import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { buildDailyShiftReport } from "@/shared/utils/shift-reports";

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? undefined;
    const report = await buildDailyShiftReport(date ?? "");
    return NextResponse.json(report);
  } catch (error) {
    console.error("GET /api/shifts/reports/daily", error);
    return NextResponse.json(
      { message: "Error al obtener reporte diario" },
      { status: 500 },
    );
  }
}

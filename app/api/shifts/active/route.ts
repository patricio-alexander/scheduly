import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import { buildActiveShiftPayload } from "@/shared/utils/shift-service";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    let shift = await prisma.cashShift.findFirst({
      where: { status: "open", accountId: auth.user.id },
      orderBy: { openedAt: "desc" },
      select: { id: true },
    });

    if (!shift && isOwnerRole(auth.user.role)) {
      shift = await prisma.cashShift.findFirst({
        where: { status: "open" },
        orderBy: { openedAt: "desc" },
        select: { id: true },
      });
    }

    if (!shift) return NextResponse.json(null);

    const payload = await buildActiveShiftPayload(shift.id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/shifts/active", error);
    return NextResponse.json(
      { message: "Error al obtener turno activo" },
      { status: 500 },
    );
  }
}

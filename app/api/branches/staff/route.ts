import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  getUserPrimaryBranchId,
  parseBranchId,
} from "@/shared/utils/branches";
import { isBranchAdminRole, isOwnerRole } from "@/shared/utils/roles";

/** Personal de sucursal (empleados y admins locales) para filtros de agenda. */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isOwnerRole(auth.user.role) && !isBranchAdminRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));

    let branchId: number | null;
    if (isOwnerRole(auth.user.role)) {
      branchId = requestedBranchId;
    } else {
      branchId = await getUserPrimaryBranchId(prisma, auth.user.id);
    }

    if (!branchId) {
      return NextResponse.json([]);
    }

    const rows = await prisma.userBranch.findMany({
      where: { branchId },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { userId: "asc" },
    });

    const staff = rows
      .map((row) => row.user)
      .filter((u) => u.role === "employee" || u.role === "admin")
      .sort((a, b) => a.name.localeCompare(b.name, "es"));

    return NextResponse.json(staff);
  } catch (error) {
    console.error("GET /api/branches/staff", error);
    return NextResponse.json(
      { message: "Error al obtener personal" },
      { status: 500 },
    );
  }
}

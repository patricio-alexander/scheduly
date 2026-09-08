import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  getUserPrimaryBranchId,
  parseBranchId,
} from "@/shared/utils/branches";
import {
  ensureAccountBranchTable,
  listAccountsForBranch,
} from "@/shared/utils/account-branch";
import {
  isBranchAdminRole,
  isOwnerRole,
  isPureEmployeeRole,
  mapExternalRoleName,
} from "@/shared/utils/roles";

/** Personal de sucursal para filtros / agendar turnos a compañeros. */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const canList =
    isOwnerRole(auth.user.role) ||
    isBranchAdminRole(auth.user.role) ||
    isPureEmployeeRole(auth.user.role);
  if (!canList) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureAccountBranchTable(prisma);
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

    const rows = await listAccountsForBranch(prisma, branchId);
    const staff = rows
      .filter((row) => {
        if (!row.isActive) return false;
        const role = mapExternalRoleName(row.roleName);
        return role === "employee" || role === "admin";
      })
      .map((row) => ({
        id: row.accountId,
        personId: row.personId ? Number(row.personId) : null,
        username: row.username,
        name: [row.firstName, row.firstLastName].filter(Boolean).join(" ").trim(),
        role: mapExternalRoleName(row.roleName),
      }))
      .filter((s) => s.personId)
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

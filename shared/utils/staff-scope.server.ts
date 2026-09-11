/**
 * Alcance de personal con Prisma (solo servidor / API).
 */
import { prisma } from "@/shared/utils/prisma";
import {
  accountBelongsToBranch,
  ensureAccountBranchTable,
  getAccountPrimaryBranchId,
  listAccountsForBranch,
} from "@/shared/utils/account-branch";
import {
  isBranchAdminRole,
  isOwnerRole,
  mapExternalRoleName,
} from "@/shared/utils/roles";
import { roleNamesFromAccount } from "@/shared/utils/account-serialize";
import type { AuthUserLite } from "@/shared/utils/staff-scope";

export async function getManagerBranchId(
  user: AuthUserLite,
): Promise<number | null> {
  if (isOwnerRole(user.role)) return null;
  await ensureAccountBranchTable(prisma);
  return getAccountPrimaryBranchId(prisma, user.id);
}

export async function listManagedAccountIds(
  user: AuthUserLite,
): Promise<"all" | number[]> {
  if (isOwnerRole(user.role)) return "all";
  const branchId = await getManagerBranchId(user);
  if (!branchId) return [];
  const rows = await listAccountsForBranch(prisma, branchId);
  return rows.map((r) => Number(r.accountId));
}

export async function accountPrimaryRoleName(
  accountId: number,
): Promise<string | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { roles: { include: { role: true }, orderBy: { id: "asc" } } },
  });
  if (!account) return null;
  const names = roleNamesFromAccount(account.roles);
  return names[0] ?? null;
}

/** Admin solo toca empleados de su local (nunca Dueña u otro admin). */
export async function assertCanManageTargetAccount(
  actor: AuthUserLite,
  targetAccountId: number,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (isOwnerRole(actor.role)) return { ok: true };

  if (!isBranchAdminRole(actor.role)) {
    return { ok: false, status: 403, message: "No autorizado" };
  }

  if (targetAccountId === actor.id) {
    return {
      ok: false,
      status: 400,
      message: "No puedes gestionar tu propia cuenta desde aquí",
    };
  }

  const branchId = await getManagerBranchId(actor);
  if (!branchId) {
    return { ok: false, status: 403, message: "Sin sucursal asignada" };
  }

  const belongs = await accountBelongsToBranch(prisma, targetAccountId, branchId);
  if (!belongs) {
    return {
      ok: false,
      status: 403,
      message: "La cuenta no pertenece a tu sucursal",
    };
  }

  const roleName = await accountPrimaryRoleName(targetAccountId);
  const mapped = mapExternalRoleName(roleName);
  if (mapped !== "employee") {
    return {
      ok: false,
      status: 403,
      message: "Solo puedes gestionar empleados de tu local",
    };
  }

  return { ok: true };
}

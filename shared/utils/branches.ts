import type { PrismaClient } from "@/generated/prisma/client";
import {
  isBranchAdminRole,
  isOwnerRole,
} from "@/shared/utils/roles";
import {
  accountBelongsToBranch,
  getAccountPrimaryBranch,
  getAccountPrimaryBranchId,
  setAccountPrimaryBranch,
} from "@/shared/utils/account-branch";

export type BranchSummary = {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  isActive: boolean;
};

type PrismaBranchDb = Pick<
  PrismaClient,
  "branch" | "$queryRawUnsafe" | "$executeRawUnsafe"
>;

export type AgendaViewMode = "all" | "branch" | "mine";

export type AuthUserForScope = {
  id: number;
  personId?: number | null;
  role: string;
};

export function parseBranchId(value: string | null | undefined): number | null {
  if (!value || value === "all") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function branchFilterWhere(branchId: number | null) {
  return branchId ? { branchId } : {};
}

export function formatBranchLabel(
  name: string,
  isMain?: boolean,
  _locationKind?: string | null,
): string {
  return isMain ? `${name} · Casa matriz` : name;
}

export function branchChartLabel(name: string, code?: string | null): string {
  const sep = name.indexOf(" · ");
  if (sep >= 0) {
    const suffix = name.slice(sep + 3).trim();
    if (suffix) return suffix;
  }
  if (code) {
    return code
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  if (name.length <= 16) return name;
  return `${name.slice(0, 14)}…`;
}

export async function getMainBranchId(
  db: Pick<PrismaClient, "branch">,
): Promise<number | null> {
  const main = await db.branch.findFirst({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return main?.id ?? null;
}

export async function resolveUserBranchId(
  db: Pick<PrismaClient, "branch">,
  role: string,
  branchId: number | null,
): Promise<number | null> {
  if (branchId) return branchId;
  if (isOwnerRole(role)) return getMainBranchId(db);
  return null;
}

/** Sucursal primaria de la cuenta (AccountBranch). Fallback matriz solo para Dueño. */
export async function getUserPrimaryBranchId(
  db: PrismaBranchDb,
  accountId: number,
): Promise<number | null> {
  const linked = await getAccountPrimaryBranchId(db, accountId);
  if (linked) return linked;
  return getMainBranchId(db);
}

/**
 * Dueña: todos los locales o el filtro pedido.
 * Administrador: solo su local (bloqueado).
 * Empleado: su local + citas propias (Person.id).
 */
export async function resolveDashboardScope(
  db: PrismaBranchDb,
  user: AuthUserForScope,
  requestedBranchId: number | null,
): Promise<{
  branchId: number | null;
  appointmentWhere: { branchId?: number; userId?: number };
  locked: boolean;
}> {
  if (isOwnerRole(user.role)) {
    return {
      branchId: requestedBranchId,
      appointmentWhere: branchFilterWhere(requestedBranchId),
      locked: false,
    };
  }

  const branchId = await getAccountPrimaryBranchId(db, user.id);

  if (isBranchAdminRole(user.role)) {
    const effective = branchId ?? (await getMainBranchId(db));
    return {
      branchId: effective,
      appointmentWhere: branchFilterWhere(effective),
      locked: true,
    };
  }

  // Empleado: agenda “mía” por Person.id
  const personId = user.personId ?? null;
  return {
    branchId: branchId ?? (await getMainBranchId(db)),
    appointmentWhere: personId ? { userId: personId } : { userId: -1 },
    locked: true,
  };
}

export async function resolveAgendaBranchFilter(
  db: PrismaBranchDb,
  user: AuthUserForScope,
  requestedBranchId: number | null,
  personalView = false,
): Promise<{
  branchId: number | null;
  locked: boolean;
  viewMode: AgendaViewMode;
}> {
  if (isOwnerRole(user.role)) {
    return {
      branchId: requestedBranchId,
      locked: false,
      viewMode: requestedBranchId ? "branch" : "all",
    };
  }

  const branchId =
    (await getAccountPrimaryBranchId(db, user.id)) ??
    (await getMainBranchId(db));

  if (isBranchAdminRole(user.role)) {
    if (personalView) {
      return { branchId, locked: true, viewMode: "mine" };
    }
    return { branchId, locked: true, viewMode: "branch" };
  }

  return { branchId, locked: true, viewMode: "mine" };
}

export async function getBranchScopeMeta(
  db: Pick<PrismaClient, "branch">,
  branchId: number | null,
  locked: boolean,
) {
  if (!branchId) {
    return { id: null as number | null, name: null as string | null, locked };
  }
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { id: true, name: true },
  });
  return {
    id: branch?.id ?? branchId,
    name: branch?.name ?? null,
    locked,
  };
}

export async function setUserPrimaryBranch(
  db: PrismaBranchDb,
  accountId: number,
  branchId: number | null | undefined,
) {
  await setAccountPrimaryBranch(db, accountId, branchId);
}

export async function getUserBranchSummary(
  db: PrismaBranchDb,
  accountId: number,
) {
  const linked = await getAccountPrimaryBranch(db, accountId);
  if (linked) return { id: linked.id, name: linked.name };

  const mainId = await getMainBranchId(db);
  if (!mainId) return null;
  return db.branch.findUnique({
    where: { id: mainId },
    select: { id: true, name: true },
  });
}

export async function userBelongsToBranch(
  db: PrismaBranchDb,
  accountId: number,
  branchId: number | null,
): Promise<boolean> {
  if (branchId == null) return true;
  return accountBelongsToBranch(db, accountId, branchId);
}

export async function resolveAgendaStaffUserId(
  db: PrismaBranchDb,
  user: AuthUserForScope,
  branchId: number | null,
  requestedUserId: number | null,
): Promise<number | null> {
  if (!requestedUserId) return null;

  if (isOwnerRole(user.role)) {
    if (branchId == null) return requestedUserId;
    const allowed = await userBelongsToBranch(db, requestedUserId, branchId);
    return allowed ? requestedUserId : null;
  }

  if (isBranchAdminRole(user.role)) {
    const adminBranchId = await getAccountPrimaryBranchId(db, user.id);
    const allowed = await userBelongsToBranch(
      db,
      requestedUserId,
      adminBranchId,
    );
    return allowed ? requestedUserId : null;
  }

  return null;
}

/** Sucursal del turno al crear/editar desde la agenda interna. */
export async function resolveAppointmentBranchId(
  db: PrismaBranchDb,
  user: AuthUserForScope,
  requestedBranchId: number | null,
  existingBranchId?: number | null,
): Promise<number | null> {
  const parsed =
    requestedBranchId != null &&
    Number.isInteger(requestedBranchId) &&
    requestedBranchId > 0
      ? requestedBranchId
      : null;

  if (isOwnerRole(user.role)) {
    if (parsed) return parsed;
    if (existingBranchId) return existingBranchId;
    return getUserPrimaryBranchId(db, user.id);
  }

  const primaryBranchId = await getAccountPrimaryBranchId(db, user.id);
  if (parsed != null && primaryBranchId != null && parsed !== primaryBranchId) {
    throw new Error("No puedes agendar turnos en otra sucursal");
  }
  return primaryBranchId ?? (await getMainBranchId(db));
}

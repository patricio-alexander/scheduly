import type { PrismaClient } from "@/generated/prisma/client";
import {
  isBranchAdminRole,
  isOwnerRole,
} from "@/shared/utils/roles";

export type BranchSummary = {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  isActive: boolean;
};

type PrismaUserBranchLookup = Pick<PrismaClient, "branch">;

export type AgendaViewMode = "all" | "branch" | "mine";

export function parseBranchId(value: string | null | undefined): number | null {
  if (!value || value === "all") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function branchFilterWhere(branchId: number | null) {
  return branchId ? { branchId } : {};
}

export function formatBranchLabel(name: string, isMain?: boolean): string {
  return isMain ? `${name} · Casa matriz` : name;
}

/** Etiqueta corta para gráficos (usa el sufijo tras " · " si existe). */
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
  if (role === "owner") return getMainBranchId(db);
  return null;
}

/** Sin UserBranch en schema nuevo: dueño/admin usan sucursal pedida o matriz. */
export async function getUserPrimaryBranchId(
  db: PrismaUserBranchLookup,
  _userId: number,
): Promise<number | null> {
  return getMainBranchId(db);
}

export async function resolveDashboardScope(
  db: PrismaUserBranchLookup,
  user: { id: number; role: string },
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

  if (isBranchAdminRole(user.role)) {
    const branchId = await getUserPrimaryBranchId(db, user.id);
    return {
      branchId,
      appointmentWhere: branchFilterWhere(branchId),
      locked: true,
    };
  }

  return {
    branchId: await getUserPrimaryBranchId(db, user.id),
    appointmentWhere: { userId: user.id },
    locked: true,
  };
}

export async function resolveAgendaBranchFilter(
  db: PrismaUserBranchLookup,
  user: { id: number; role: string },
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

  if (isBranchAdminRole(user.role)) {
    const branchId = await getUserPrimaryBranchId(db, user.id);
    if (personalView) {
      return { branchId, locked: true, viewMode: "mine" };
    }
    return { branchId, locked: true, viewMode: "branch" };
  }

  return { branchId: null, locked: true, viewMode: "mine" };
}

export async function getBranchScopeMeta(
  db: PrismaUserBranchLookup,
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
  _db: PrismaUserBranchLookup,
  _userId: number,
  _branchId: number | null | undefined,
) {
  // UserBranch eliminado del schema; la sucursal activa se elige en sesión/UI.
}

export async function getUserBranchSummary(
  db: PrismaUserBranchLookup,
  _userId: number,
) {
  const mainId = await getMainBranchId(db);
  if (!mainId) return null;
  return db.branch.findUnique({
    where: { id: mainId },
    select: { id: true, name: true },
  });
}

export async function userBelongsToBranch(
  _db: PrismaUserBranchLookup,
  _userId: number,
  branchId: number | null,
): Promise<boolean> {
  // Sin UserBranch: cualquier usuario puede verse en cualquier sucursal (Dueño filtra).
  return branchId == null || branchId > 0;
}

export async function resolveAgendaStaffUserId(
  db: PrismaUserBranchLookup,
  user: { id: number; role: string },
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
    const adminBranchId = await getUserPrimaryBranchId(db, user.id);
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
  db: PrismaUserBranchLookup,
  user: { id: number; role: string },
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

  const primaryBranchId = await getUserPrimaryBranchId(db, user.id);
  if (parsed != null && primaryBranchId != null && parsed !== primaryBranchId) {
    throw new Error("No puedes agendar turnos en otra sucursal");
  }
  return primaryBranchId;
}

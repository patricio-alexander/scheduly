/**
 * Alcance de gestión de personal (sin I/O — seguro en cliente).
 * Dueña → todas las cuentas.
 * Administrador → solo Empleados de su sucursal primaria.
 */
import {
  isBranchAdminRole,
  isOwnerRole,
  isProgrammerRole,
  mapExternalRoleName,
} from "@/shared/utils/roles";

export type AuthUserLite = {
  id: number;
  role: string;
};

export function canManageGlobalAccounts(role: string | null | undefined) {
  return isOwnerRole(role);
}

export function canManageBranchStaff(role: string | null | undefined) {
  return isOwnerRole(role) || isBranchAdminRole(role);
}

/** Dueña/Admin de local + Programador (bootstrap / lectura de cuentas). */
export function canAccessAccountsModule(role: string | null | undefined) {
  return canManageBranchStaff(role) || isProgrammerRole(role);
}

/** Roles que un Administrador puede asignar al crear/editar. */
export function rolesAllowedForBranchAdmin(roles: string[]): string[] {
  const cleaned = roles.map((r) => String(r).trim()).filter(Boolean);
  if (cleaned.length === 0) return ["Empleado"];
  const onlyEmployee = cleaned.every(
    (r) => mapExternalRoleName(r) === "employee",
  );
  return onlyEmployee ? cleaned : ["Empleado"];
}

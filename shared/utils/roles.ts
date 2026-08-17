export type AppRole = "owner" | "admin" | "employee" | "user";

/** Rol central del negocio (Andrea / dueño) */
export function isOwnerRole(role: string | null | undefined): boolean {
  return role === "owner";
}

/** Encargado/a de sucursal (admin + empleado) */
export function isBranchAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Empleado operativo sin rol de encargado */
export function isPureEmployeeRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "employee";
}

/** Dueño o admin de sucursal */
export function isManagementRole(role: string | null | undefined): boolean {
  return isOwnerRole(role) || isBranchAdminRole(role);
}

/** @deprecated Usar isManagementRole o isOwnerRole según el caso */
export function isAdminRole(role: string | null | undefined): boolean {
  return isManagementRole(role);
}

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "employee" || role === "user") return "employee";
  return "employee";
}

/** Empleado puro (alias de isPureEmployeeRole) */
export function isEmployeeRole(role: string | null | undefined): boolean {
  return isPureEmployeeRole(role);
}

/** Mi día, Mi agenda y otras vistas personales de turnos */
export function hasEmployeeExperience(
  role: string | null | undefined,
): boolean {
  return isPureEmployeeRole(role) || isBranchAdminRole(role);
}

export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Encargado sucursal";
    case "employee":
    case "user":
      return "Empleado";
    default:
      return "Empleado";
  }
}

export function canDeleteRecords(role: string | null | undefined): boolean {
  return isManagementRole(role);
}

export function canViewRevenue(role: string | null | undefined): boolean {
  return isManagementRole(role);
}

/** @deprecated usar canViewRevenue */
export function canViewFinancialDashboard(role: string | null | undefined): boolean {
  return canViewRevenue(role);
}

export function canAccessSystemModule(role: string | null | undefined): boolean {
  return isOwnerRole(role);
}

export function canManageUsers(role: string | null | undefined): boolean {
  return isOwnerRole(role);
}

export function canTransferStock(role: string | null | undefined): boolean {
  return isManagementRole(role);
}

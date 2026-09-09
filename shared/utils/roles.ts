export type AppRole = "owner" | "admin" | "employee" | "user" | "programmer";

/**
 * Normaliza nombres de rol (español o legacy) → AppRole interno.
 * Dueño → owner · Administrador → admin · Empleado → employee · Programador → programmer
 */
export function mapExternalRoleName(name: string | null | undefined): AppRole {
  const n = String(name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (n === "owner" || n === "dueno" || n === "dueño") {
    return "owner";
  }

  if (n === "programador" || n === "programmer" || n === "dev") {
    return "programmer";
  }

  if (
    n === "admin" ||
    n === "administrador" ||
    n === "encargado" ||
    n === "encargado sucursal"
  ) {
    return "admin";
  }

  if (n === "employee" || n === "empleado" || n === "user") {
    return "employee";
  }

  return "employee";
}

/** Rol central del negocio (Dueño) */
export function isOwnerRole(role: string | null | undefined): boolean {
  return mapExternalRoleName(role) === "owner";
}

/** Observador técnico: logs + menú tester (sin operar el negocio) */
export function isProgrammerRole(role: string | null | undefined): boolean {
  return mapExternalRoleName(role) === "programmer";
}

/** Administrador / encargado de sucursal */
export function isBranchAdminRole(role: string | null | undefined): boolean {
  return mapExternalRoleName(role) === "admin";
}

/** Empleado operativo sin rol de administrador */
export function isPureEmployeeRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "employee";
}

/** Dueño o administrador */
export function isManagementRole(role: string | null | undefined): boolean {
  return isOwnerRole(role) || isBranchAdminRole(role);
}

/** @deprecated Usar isManagementRole o isOwnerRole según el caso */
export function isAdminRole(role: string | null | undefined): boolean {
  return isManagementRole(role);
}

export function normalizeRole(role: string | null | undefined): AppRole {
  return mapExternalRoleName(role);
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
  switch (mapExternalRoleName(role)) {
    case "owner":
      return "Dueño";
    case "admin":
      return "Administrador";
    case "programmer":
      return "Programador";
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

/** Dueña gestiona; Programador también (bootstrap Dueña + ver roles/cuentas). */
export function canManageUsers(role: string | null | undefined): boolean {
  return isOwnerRole(role) || isProgrammerRole(role);
}

/** Alta/edición de roles de negocio: solo Dueña. */
export function canEditRoles(role: string | null | undefined): boolean {
  return isOwnerRole(role);
}

export function canTransferStock(role: string | null | undefined): boolean {
  return isManagementRole(role);
}

/** Rutas permitidas para Programador. */
export function isProgrammerAllowedPath(pathname: string): boolean {
  return (
    pathname === "/inicio" ||
    pathname === "/panel" ||
    pathname === "/sistema" ||
    pathname.startsWith("/sistema/") ||
    pathname === "/administracion/usuarios" ||
    pathname === "/administracion/cuentas" ||
    pathname === "/administracion/roles" ||
    pathname.startsWith("/administracion/usuarios/") ||
    pathname.startsWith("/administracion/cuentas/") ||
    pathname.startsWith("/administracion/roles/")
  );
}

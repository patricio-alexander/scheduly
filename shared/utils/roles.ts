export type AppRole = "admin" | "employee" | "user";

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "admin") return "admin";
  if (role === "employee" || role === "user") return "employee";
  return "employee";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}

export function isEmployeeRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "employee";
}

/** Empleados no pueden borrar catálogo ni clientes */
export function canDeleteRecords(role: string | null | undefined): boolean {
  return isAdminRole(role);
}

/** Empleados no ven el KPI de ingresos */
export function canViewRevenue(role: string | null | undefined): boolean {
  return isAdminRole(role);
}

/** @deprecated usar canViewRevenue */
export function canViewFinancialDashboard(role: string | null | undefined): boolean {
  return canViewRevenue(role);
}

/** Empleados no ven el módulo Sistema */
export function canAccessSystemModule(role: string | null | undefined): boolean {
  return isAdminRole(role);
}

/**
 * Catálogo de probes API para bots conscientes.
 * expect: allow = 2xx · deny = 401/403 · soft = cualquier respuesta HTTP (solo que no tire red)
 */
export type BotRole = "owner" | "admin" | "employee";

export type ProbeExpect = "allow" | "deny" | "soft";

export type ApiProbe = {
  id: string;
  label: string;
  /** path relativo a /api… (puede incluir query) */
  path: string;
  /** Si true, dueña puede anexar ?branchId= */
  branchAware?: boolean;
  expect: Record<BotRole, ProbeExpect>;
};

export const API_PROBES: ApiProbe[] = [
  {
    id: "me",
    label: "Sesión /api/auth/me",
    path: "/api/auth/me",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "dashboard",
    label: "Panel",
    path: "/api/dashboard?period=week",
    branchAware: true,
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "branches",
    label: "Sucursales",
    path: "/api/branches",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "customers",
    label: "Clientes",
    path: "/api/customers",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "services",
    label: "Servicios",
    path: "/api/services",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "products",
    label: "Productos",
    path: "/api/products",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "appointments",
    label: "Agenda",
    path: "/api/appointments",
    branchAware: true,
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "appointments-mine",
    label: "Mi agenda",
    path: "/api/appointments?view=mine",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "cash",
    label: "Caja",
    path: "/api/cash",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "shifts-active",
    label: "Turno activo",
    path: "/api/shifts/active",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "pos-sales",
    label: "Ventas POS",
    path: "/api/orders/pos-sales?limit=30",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "notifications",
    label: "Notificaciones",
    path: "/api/notifications",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "settings",
    label: "Settings",
    path: "/api/settings",
    expect: { owner: "allow", admin: "allow", employee: "allow" },
  },
  {
    id: "users",
    label: "Cuentas / users",
    path: "/api/users?includeInactive=1",
    expect: { owner: "allow", admin: "allow", employee: "deny" },
  },
  {
    id: "roles",
    label: "Roles",
    path: "/api/roles",
    // GET listado hoy es auth-only; empleado "deny" marca hueco si responde 200.
    expect: { owner: "allow", admin: "allow", employee: "deny" },
  },
  {
    id: "suppliers",
    label: "Proveedores",
    path: "/api/suppliers",
    expect: { owner: "allow", admin: "allow", employee: "deny" },
  },
  {
    id: "purchases",
    label: "Compras",
    path: "/api/purchases",
    expect: { owner: "allow", admin: "allow", employee: "deny" },
  },
  {
    id: "finance-summary",
    label: "Finanzas resumen",
    path: "/api/finance/ledger-summary",
    expect: { owner: "allow", admin: "allow", employee: "deny" },
  },
  {
    id: "finance-incomes",
    label: "Finanzas ingresos",
    path: "/api/finance/incomes",
    expect: { owner: "allow", admin: "allow", employee: "deny" },
  },
  {
    id: "finance-expenses",
    label: "Finanzas gastos",
    path: "/api/finance/expenses-ledger",
    expect: { owner: "allow", admin: "allow", employee: "deny" },
  },
  {
    id: "inventory-movements",
    label: "Kardex movimientos",
    path: "/api/inventory/movements?take=20",
    expect: { owner: "allow", admin: "allow", employee: "deny" },
  },
  {
    id: "inventory-value",
    label: "Inventario valorizado",
    path: "/api/inventory/value-summary",
    expect: { owner: "allow", admin: "allow", employee: "deny" },
  },
  {
    id: "sri",
    label: "SRI config",
    path: "/api/sri",
    expect: { owner: "allow", admin: "deny", employee: "deny" },
  },
  {
    id: "backups-list",
    label: "Backups (dueña)",
    path: "/api/backups",
    expect: { owner: "allow", admin: "deny", employee: "deny" },
  },
  {
    id: "system-logs",
    label: "Logs del sistema (programador/dueña)",
    path: "/api/system/logs?limit=5",
    expect: { owner: "allow", admin: "deny", employee: "deny" },
  },
];

export function evaluateProbe(
  expect: ProbeExpect,
  status: number,
  ok: boolean,
): { pass: boolean; note: string } {
  if (expect === "soft") {
    return {
      pass: status > 0,
      note: `HTTP ${status}`,
    };
  }
  if (expect === "allow") {
    const pass = ok && status >= 200 && status < 300;
    return {
      pass,
      note: pass
        ? `OK acceso HTTP ${status}`
        : `FALLÓ: debía poder y llegó HTTP ${status}`,
    };
  }
  // deny
  const pass = status === 401 || status === 403 || (!ok && status >= 400);
  return {
    pass,
    note: pass
      ? `OK denegado HTTP ${status} (sin permiso)`
      : `FALLÓ: debía bloquear y llegó HTTP ${status}`,
  };
}

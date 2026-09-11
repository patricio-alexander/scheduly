/**
 * Catálogo de acciones para SystemLog (Scheduly), estilo EdDeli.
 */

const RESOURCE_LABELS: Record<string, string> = {
  auth: "auth",
  login: "Login",
  logout: "Logout",
  appointments: "cita",
  "product-sales": "venta POS",
  products: "producto",
  customers: "cliente",
  suppliers: "proveedor",
  purchases: "compra",
  orders: "pedido",
  shifts: "turno",
  cash: "caja",
  finance: "finanzas",
  incomes: "ingreso",
  "expenses-ledger": "gasto",
  users: "cuenta",
  roles: "rol",
  settings: "configuración",
  sri: "SRI",
  backups: "backup",
  branches: "sucursal",
  services: "servicio",
  inventory: "inventario",
  movements: "movimiento",
  notifications: "notificación",
  payment: "pago",
};

const METHOD_VERB: Record<string, string> = {
  POST: "Crear/ejecutar",
  PUT: "Actualizar",
  PATCH: "Modificar",
  DELETE: "Eliminar",
};

const EXPLICIT: Array<{ method: string; pattern: RegExp; action: string }> = [
  { method: "POST", pattern: /\/api\/auth\/login\/?$/, action: "Login" },
  { method: "POST", pattern: /\/api\/auth\/logout\/?$/, action: "Logout" },
  {
    method: "POST",
    pattern: /\/api\/users\/?$/,
    action: "Crear cuenta",
  },
  { method: "POST", pattern: /\/api\/shifts\/open\/?$/, action: "Abrir turno" },
  { method: "POST", pattern: /\/api\/shifts\/\d+\/close\/?$/, action: "Cerrar turno" },
  {
    method: "POST",
    pattern: /\/api\/appointments\/\d+\/payment\/?$/,
    action: "Cobrar cita",
  },
  { method: "POST", pattern: /\/api\/product-sales\/?$/, action: "Venta POS" },
  { method: "POST", pattern: /\/api\/purchases\/?$/, action: "Registrar compra" },
  {
    method: "POST",
    pattern: /\/api\/branches\/transfers\/?$/,
    action: "Traspaso de stock",
  },
  {
    method: "POST",
    pattern: /\/api\/inventory\/movements\/?$/,
    action: "Movimiento de inventario",
  },
];

function normalizePath(endPoint: string): string {
  const raw = String(endPoint || "").split("?")[0] || "";
  // quita basePath si viene
  return raw.replace(/^\/scheduly/, "") || "/";
}

export function resolveLogAction(method: string, endPoint: string): string {
  const m = String(method || "POST").toUpperCase();
  const path = normalizePath(endPoint);

  for (const rule of EXPLICIT) {
    if (rule.method === m && rule.pattern.test(path)) return rule.action;
  }

  const parts = path.split("/").filter(Boolean);
  // api / resource / ...
  const resourceIdx = parts[0] === "api" ? 1 : 0;
  const resource = parts[resourceIdx] ?? "recurso";
  const label = RESOURCE_LABELS[resource] ?? resource;
  const verb = METHOD_VERB[m] ?? m;
  return `${verb} ${label}`;
}

export function displayLogAction(action: string | null | undefined): string {
  return String(action ?? "—").trim() || "—";
}

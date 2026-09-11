/**
 * Mapa “pantalla UI → APIs” · el bot “abre” la página y mira los datos.
 * No es Playwright: simula el clic narrando la ruta + probes GET.
 */
import type { BotRole } from "./route-catalog";

export type UiTourStop = {
  id: string;
  /** Ruta de la app (sin basePath) */
  href: string;
  label: string;
  /** Qué “hace” al entrar (comentario) */
  intent: string;
  /** ids de API_PROBES a disparar al visitar */
  probeIds: string[];
  /** roles que suelen abrir esta pantalla */
  roles: BotRole[];
};

export const UI_TOUR: UiTourStop[] = [
  {
    id: "panel",
    href: "/panel",
    label: "Panel",
    intent: "Mira el resumen del negocio / día",
    probeIds: ["dashboard", "notifications", "me"],
    roles: ["owner", "admin", "employee"],
  },
  {
    id: "agenda",
    href: "/operacion/agenda",
    label: "Agenda",
    intent: "Revisa citas y huecos",
    probeIds: ["appointments", "appointments-mine", "services"],
    roles: ["owner", "admin", "employee"],
  },
  {
    id: "caja",
    href: "/operacion/caja",
    label: "Caja / turno",
    intent: "Chequea turno activo y caja",
    probeIds: ["shifts-active", "cash", "pos-sales"],
    roles: ["owner", "admin", "employee"],
  },
  {
    id: "clientes",
    href: "/ventas/clientes",
    label: "Clientes",
    intent: "Lista clientes del local",
    probeIds: ["customers"],
    roles: ["owner", "admin", "employee"],
  },
  {
    id: "catalogo",
    href: "/catalogo/productos",
    label: "Catálogo",
    intent: "Mira productos y servicios",
    probeIds: ["products", "services"],
    roles: ["owner", "admin", "employee"],
  },
  {
    id: "finanzas",
    href: "/finanzas/centro",
    label: "Finanzas",
    intent: "Entra al centro financiero",
    probeIds: ["finance-summary", "finance-incomes", "finance-expenses"],
    roles: ["owner", "admin"],
  },
  {
    id: "inventario",
    href: "/inventario/movimientos",
    label: "Kardex",
    intent: "Mira movimientos de stock",
    probeIds: ["inventory-movements"],
    roles: ["owner", "admin"],
  },
  {
    id: "inventario-valor",
    href: "/inventario/valor",
    label: "Inventario valorizado",
    intent: "Revisa valor a costo y a venta de productos",
    probeIds: ["products", "inventory-value"],
    roles: ["owner", "admin"],
  },
  {
    id: "cuentas",
    href: "/administracion/cuentas",
    label: "Cuentas",
    intent: "Revisa usuarios del sistema",
    probeIds: ["users", "roles"],
    roles: ["owner", "admin"],
  },
  {
    id: "compras",
    href: "/compras",
    label: "Compras",
    intent: "Compras e ingresos de stock",
    probeIds: ["purchases"],
    roles: ["owner", "admin"],
  },
  {
    id: "config",
    href: "/sistema/configuracion",
    label: "Configuración",
    intent: "Lee settings del negocio (sin tocar aún)",
    probeIds: ["settings", "branches"],
    roles: ["owner", "admin", "employee"],
  },
  {
    id: "sri",
    href: "/operacion/comprobantes-pos",
    label: "SRI / comprobantes",
    intent: "Intenta ver config SRI (dueña sí, otros no)",
    probeIds: ["sri"],
    roles: ["owner", "admin", "employee"],
  },
  {
    id: "backups",
    href: "/sistema/configuracion?tab=backups",
    label: "Backups",
    intent: "Lista backups (solo dueña)",
    probeIds: ["backups-list"],
    roles: ["owner", "admin", "employee"],
  },
  {
    id: "logs",
    href: "/sistema/logs",
    label: "Logs del sistema",
    intent: "Mira mutaciones HTTP recientes",
    probeIds: ["system-logs"],
    roles: ["owner", "admin", "employee"],
  },
];

export function uiStopsForRole(role: BotRole): UiTourStop[] {
  return UI_TOUR.filter((s) => s.roles.includes(role));
}

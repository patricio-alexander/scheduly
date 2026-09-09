import { appRoutes } from "@/shared/utils/app-routes";

export type TutorialHubEntry = {
  id: string;
  title: string;
  description: string;
  /** Grupo visual en el hub */
  group: string;
  /** Ruta a la que navega para enseñar el tutorial */
  route: string;
  /** Solo Programador (p. ej. logout + login) */
  programmerOnly?: boolean;
};

/**
 * Catálogo del módulo Tutoriales: un ítem por módulo / tour completo.
 * Al lanzar: va a la página → corre el tutorial → vuelve al hub.
 */
export const TUTORIAL_HUB_ENTRIES: TutorialHubEntry[] = [
  {
    id: "agenda",
    title: "Agenda",
    description: "Citas, calendario y alta de turnos.",
    group: "Operación",
    route: appRoutes.operation.agenda,
  },
  {
    id: "services",
    title: "Servicios",
    description: "Catálogo de servicios del salón.",
    group: "Operación",
    route: appRoutes.operation.services,
  },
  {
    id: "cash",
    title: "Caja",
    description: "Punto de venta: productos, stock y cobro.",
    group: "Operación",
    route: appRoutes.operation.cash,
  },
  {
    id: "shifts",
    title: "Turno",
    description: "Apertura, supervisión y cierre de caja.",
    group: "Operación",
    route: appRoutes.operation.shifts,
  },
  {
    id: "tasks",
    title: "Tareas",
    description: "Tablero de tareas del equipo.",
    group: "Operación",
    route: appRoutes.operation.tasks,
  },
  {
    id: "products",
    title: "Productos",
    description: "Alta de productos, precio, comisión y stock.",
    group: "Inventario",
    route: appRoutes.inventory.products,
  },
  {
    id: "categories",
    title: "Categorías",
    description: "Agrupá productos por categoría.",
    group: "Inventario",
    route: appRoutes.inventory.categories,
  },
  {
    id: "units",
    title: "Unidades",
    description: "Unidades de medida (ml, und, L…).",
    group: "Inventario",
    route: appRoutes.inventory.units,
  },
  {
    id: "customers",
    title: "Clientes",
    description: "Alta y ficha de clientes.",
    group: "Ventas y compras",
    route: appRoutes.sales.customers,
  },
  {
    id: "suppliers",
    title: "Proveedores",
    description: "Proveedores para compras e inventario.",
    group: "Ventas y compras",
    route: appRoutes.purchases.suppliers,
  },
  {
    id: "branches",
    title: "Sucursales",
    description: "Locales y equipos por sucursal.",
    group: "Administración",
    route: appRoutes.branches.list,
  },
  {
    id: "roles",
    title: "Roles",
    description: "Roles del sistema y permisos.",
    group: "Administración",
    route: appRoutes.admin.roles,
  },
  {
    id: "accounts",
    title: "Cuentas",
    description: "Usuarios y accesos del equipo.",
    group: "Administración",
    route: appRoutes.admin.accounts,
  },
  {
    id: "settings",
    title: "Configuración",
    description: "Marca, sistema, inventario y opciones de caja.",
    group: "Sistema",
    route: `${appRoutes.system.settings}?tutorial=1`,
  },
  {
    id: "login",
    title: "Login",
    description: "Pantalla de ingreso (cierra sesión para mostrarla).",
    group: "Sistema",
    route: `${appRoutes.login}?tutorial=1`,
    programmerOnly: true,
  },
];

export const TUTORIAL_HUB_GROUPS = [
  "Operación",
  "Inventario",
  "Ventas y compras",
  "Administración",
  "Sistema",
] as const;

export function tutorialHubEntriesForRole(opts: {
  isProgrammer: boolean;
}): TutorialHubEntry[] {
  return TUTORIAL_HUB_ENTRIES.filter(
    (e) => !e.programmerOnly || opts.isProgrammer,
  );
}

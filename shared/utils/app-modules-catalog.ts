/**
 * Catálogo de módulos Scheduly (menú propio, no compartido con las otras apps).
 * Mantener sincronizado con `nav-config.ts`.
 */

import { appRoutes } from "@/shared/utils/app-routes";

export type CatalogSectionStatus = "active" | "planned" | "maintenance" | "development";

export type AppModuleCatalogSection = {
  name: string;
  path: string;
  status?: CatalogSectionStatus;
  description: string;
};

export type AppModuleCatalogGroup = {
  id: string;
  entitlementKey: string;
  label: string;
  summary: string;
  status?: CatalogSectionStatus;
  sections: AppModuleCatalogSection[];
};

export const APP_MODULE_CATALOG: AppModuleCatalogGroup[] = [
  {
    id: "acceso",
    entitlementKey: "operation",
    label: "Acceso rápido",
    summary: "Panel y notificaciones al iniciar sesión.",
    sections: [
      {
        name: "Panel",
        path: appRoutes.dashboard,
        description: "Resumen del negocio: finanzas, citas, clientes e inventario.",
      },
      {
        name: "Notificaciones",
        path: appRoutes.system.notifications,
        description: "Avisos del sistema y mensajes para el equipo.",
      },
    ],
  },
  {
    id: "operacion",
    entitlementKey: "operation",
    label: "Operación",
    summary:
      "Agenda, servicios, caja, turno, tareas, locales y catálogo.",
    sections: [
      {
        name: "Agenda",
        path: appRoutes.operation.agenda,
        description: "Calendario de citas por sucursal o personal.",
      },
      {
        name: "Servicios",
        path: appRoutes.operation.services,
        description: "Catálogo de servicios (corte, color, tratamientos, etc.).",
      },
      {
        name: "Caja",
        path: appRoutes.operation.cash,
        status: "planned",
        description: "Cobro en mostrador: servicios, productos y comprobantes POS.",
      },
      {
        name: "Turno",
        path: appRoutes.operation.shifts,
        status: "planned",
        description: "Apertura/cierre de caja, capital inicial y efectivo.",
      },
      {
        name: "Tareas",
        path: appRoutes.operation.tasks,
        description: "Planes de trabajo y checklist del equipo.",
      },
      {
        name: "Comprobantes POS",
        path: appRoutes.operation.posReceipts,
        description:
          "Reimpresión de ventas de caja con estado SRI embebido.",
      },
      {
        name: "Supervisión caja",
        path: appRoutes.operation.shiftSupervision,
        status: "planned",
        description: "Revisión de turnos cerrados y diferencias.",
      },
      {
        name: "Sucursales / locales",
        path: appRoutes.operation.stores,
        description: "Locales del negocio (multi-local).",
      },
      {
        name: "Catálogo",
        path: appRoutes.operation.catalog,
        description: "Configuración del catálogo de productos/servicios.",
      },
    ],
  },
  {
    id: "ventas-compras",
    entitlementKey: "sales",
    label: "Ventas y Compras",
    summary: "Pedidos, clientes, proveedores, ventas y compras.",
    sections: [
      {
        name: "Pedidos",
        path: appRoutes.sales.orders,
        status: "planned",
        description: "Órdenes y pedidos de clientes.",
      },
      {
        name: "Clientes",
        path: appRoutes.sales.customers,
        description: "Cartera de clientes.",
      },
      {
        name: "Proveedores",
        path: appRoutes.purchases.suppliers,
        description: "Catálogo de proveedores.",
      },
      {
        name: "Ventas",
        path: appRoutes.sales.salesHub,
        description: "Hub de ventas de productos.",
      },
      {
        name: "Compras",
        path: appRoutes.purchases.hub,
        description: "Hub de compras a proveedores.",
      },
    ],
  },
  {
    id: "finanzas",
    entitlementKey: "finance",
    label: "Finanzas",
    summary: "Movimientos y cobranzas.",
    sections: [
      {
        name: "Finanzas",
        path: appRoutes.finance.transactions,
        description: "Centro de movimientos y resumen financiero.",
      },
      {
        name: "Cobranzas",
        path: appRoutes.finance.collections,
        description: "Cobranzas a clientes y proveedores.",
      },
    ],
  },
  {
    id: "inventario",
    entitlementKey: "inventory",
    label: "Inventario",
    summary:
      "Productos, movimientos, categorías, tramos, unidades, lotes y valor (multistock permanente).",
    sections: [
      {
        name: "Productos",
        path: appRoutes.inventory.products,
        description: "Catálogo de productos e insumos.",
      },
      {
        name: "Movimientos",
        path: appRoutes.inventory.movement,
        status: "planned",
        description: "Entradas, salidas y ajustes.",
      },
      {
        name: "Categorías",
        path: appRoutes.inventory.categories,
        description: "Clasificación de productos.",
      },
      {
        name: "Tramos",
        path: appRoutes.inventory.tierGroups,
        status: "planned",
        description: "Precios por cantidad.",
      },
      {
        name: "Unidades",
        path: appRoutes.inventory.units,
        status: "maintenance",
        description: "Unidades de medida.",
      },
      {
        name: "Lotes y vencimientos",
        path: appRoutes.inventory.batches,
        status: "planned",
        description: "Lotes con fechas de vencimiento.",
      },
      {
        name: "Valor de inventario",
        path: appRoutes.inventory.value,
        status: "planned",
        description: "Valor a costo y a precio de venta.",
      },
    ],
  },
  {
    id: "marketing",
    entitlementKey: "marketing",
    label: "Marketing",
    summary: "Promociones y noticias.",
    status: "planned",
    sections: [
      {
        name: "Promociones",
        path: appRoutes.marketing.promotions,
        description: "Promos del negocio.",
      },
      {
        name: "Noticias",
        path: appRoutes.marketing.news,
        status: "planned",
        description: "Noticias y novedades.",
      },
    ],
  },
  {
    id: "administracion",
    entitlementKey: "admin",
    label: "Administración",
    summary: "Usuarios, cuentas y roles.",
    sections: [
      {
        name: "Usuarios",
        path: appRoutes.admin.users,
        description: "Cuentas del personal.",
      },
      {
        name: "Cuentas",
        path: appRoutes.admin.accounts,
        status: "planned",
        description: "Cuentas vinculadas / multi-cuenta.",
      },
      {
        name: "Roles",
        path: appRoutes.admin.roles,
        description: "Dueño, encargado de sucursal, empleado.",
      },
    ],
  },
  {
    id: "sistema",
    entitlementKey: "system",
    label: "Sistema",
    summary: "Configuración, planes, módulos, perfil y donaciones.",
    sections: [
      {
        name: "Configuración",
        path: appRoutes.system.settings,
        description:
          "Negocio, apariencia, SRI, locales, multistock y backups JSON (Dueño).",
      },
      {
        name: "Planes",
        path: appRoutes.system.plans,
        description: "Planes comerciales del gestor.",
      },
      {
        name: "Módulos",
        path: appRoutes.system.modules,
        description: "Catálogo de módulos del gestor.",
      },
      {
        name: "Backups JSON",
        path: appRoutes.system.backups,
        description:
          "Atajo a Configuración → Backups (exportar, subir y recargar BD; solo Dueño).",
      },
      {
        name: "Perfil",
        path: appRoutes.system.profile,
        description: "Perfil del usuario autenticado.",
      },
      {
        name: "Donaciones",
        path: appRoutes.system.donations,
        status: "planned",
        description: "Apoyo al proyecto.",
      },
    ],
  },
];

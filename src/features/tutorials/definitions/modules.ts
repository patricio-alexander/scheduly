import type { SchedulyTourStep } from "../core/run-tour";
import { moduleTours } from "@/src/features/onboarding/lib/steps";
import { appRoutes } from "@/shared/utils/app-routes";

export type ModuleDriverTour = {
  id: string;
  label: string;
  /** Prefijos de ruta (más específico gana). */
  match: string[];
  /** Si true, el orquestador no auto-arranca (tienen gate propio). */
  skipAuto?: boolean;
  steps: SchedulyTourStep[];
};

function onboardingTarget(target: string): string {
  return `[data-onboarding='${target}']`;
}

function tourTarget(target: string): string {
  return `[data-tour='${target}']`;
}

/** Convierte pasos legacy (data-onboarding) a driver.js. */
function fromOnboardingSteps(
  steps: Array<{
    title: string;
    description: string;
    target?: string;
    dwellMs?: number;
  }>,
): SchedulyTourStep[] {
  return steps
    .filter((s) => s.target)
    .map((s) => ({
      element: onboardingTarget(s.target!),
      allowMissing: true,
      dwellMs: s.dwellMs ?? 2800,
      popover: {
        title: s.title,
        description: `${s.description} El tour avanza solo; usa Pausa o Siguiente cuando quieras.`,
        side: "bottom" as const,
        align: "start" as const,
      },
    }));
}

function pageIntro(
  title: string,
  description: string,
  extra: SchedulyTourStep[] = [],
): SchedulyTourStep[] {
  return [
    {
      dwellMs: 2800,
      popover: {
        title,
        description: `${description} El tour avanza solo; usa Pausa o Siguiente a tu ritmo.`,
        align: "center",
      },
    },
    ...extra,
  ];
}

/**
 * Catálogo unificado de tours driver.js por pantalla.
 * Login / Inicio shell / Config / EntityCreate / Sucursales / Agenda: gates propios (skipAuto).
 */
export const MODULE_DRIVER_TOURS: ModuleDriverTour[] = [
  // Legacy onboarding → driver.js (CRUD con EntityCreate y agenda/branches tienen gate)
  ...moduleTours
    .filter(
      (t) =>
        t.id !== "agenda" &&
        t.id !== "customers" &&
        t.id !== "inventory",
    )
    .map((t) => ({
      id: t.id,
      label: t.label,
      match: t.match,
      steps: fromOnboardingSteps(t.steps),
    })),

  {
    id: "agenda",
    label: "Agenda",
    match: [appRoutes.operation.agenda],
    skipAuto: true,
    steps: [],
  },

  // Alta de entidad: vacío → modal → puntero/onda → escribir → lista (gate propio)
  {
    id: "customers",
    label: "Clientes",
    match: [appRoutes.sales.customers],
    skipAuto: true,
    steps: [],
  },
  {
    id: "products",
    label: "Productos",
    match: [appRoutes.inventory.products],
    skipAuto: true,
    steps: [],
  },
  {
    id: "categories",
    label: "Categorías",
    match: [appRoutes.inventory.categories],
    skipAuto: true,
    steps: [],
  },
  {
    id: "units",
    label: "Unidades",
    match: [appRoutes.inventory.units],
    skipAuto: true,
    steps: [],
  },
  {
    id: "services",
    label: "Servicios",
    match: [appRoutes.operation.services, "/services"],
    skipAuto: true,
    steps: [],
  },
  {
    id: "roles",
    label: "Roles",
    match: [appRoutes.admin.roles],
    skipAuto: true,
    steps: [],
  },
  {
    id: "accounts",
    label: "Cuentas",
    match: [appRoutes.admin.accounts, appRoutes.admin.users],
    skipAuto: true,
    steps: [],
  },

  // Operación
  {
    id: "cash",
    label: "Caja",
    match: [appRoutes.operation.cash],
    steps: [
      {
        element: tourTarget("caja-header"),
        allowMissing: true,
        dwellMs: 2600,
        popover: {
          title: "Punto de venta",
          description:
            "Aquí cobras ventas del día. El icono indica si hay turno abierto. El tour avanza solo; usa Pausa o Siguiente a tu ritmo.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: tourTarget("caja-product-search"),
        allowMissing: true,
        dwellMs: 2800,
        popover: {
          title: "Buscar producto",
          description:
            "Escribe nombre o código y elige de la lista para agregar al carrito.",
          side: "bottom",
          align: "start",
        },
      },
      {
        // Solo si Config → Caja POS «Crear producto» está activo
        element: tourTarget("caja-create-product"),
        dwellMs: 2600,
        popover: {
          title: "Crear producto",
          description:
            "El + abre el alta rápida de un producto. Se oculta si desactivás la opción en Configuración.",
          side: "bottom",
          align: "start",
        },
      },
      {
        // Solo si Config → Caja POS «Mostrar stock» está activo
        element: tourTarget("caja-show-stock"),
        dwellMs: 2600,
        popover: {
          title: "Mostrar stock",
          description:
            "Activa esta casilla para ver existencias en el buscador y en el carrito.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: tourTarget("caja-cart"),
        allowMissing: true,
        dwellMs: 2800,
        popover: {
          title: "Carrito de venta",
          description:
            "Revisa cantidades, precios e IVA. En opciones (si hay líneas y según config): autocompletar stock, editar o quitar.",
          side: "top",
          align: "center",
        },
      },
      {
        // Solo con ítems en carrito + flag autocompletar
        element: tourTarget("caja-autocomplete-stock"),
        dwellMs: 2400,
        popover: {
          title: "Autocompletar stock",
          description:
            "Pone la cantidad igual al stock disponible. Solo aparece si está activo en config y hay productos en el carrito.",
          side: "left",
          align: "center",
        },
      },
      {
        // Solo con ítems en carrito + flag editar
        element: tourTarget("caja-edit-product"),
        dwellMs: 2400,
        popover: {
          title: "Editar producto",
          description:
            "Abre el producto para editarlo. Solo aparece si está activo en config y hay productos en el carrito.",
          side: "left",
          align: "center",
        },
      },
      {
        element: tourTarget("caja-sell-actions"),
        allowMissing: true,
        dwellMs: 2600,
        popover: {
          title: "Cobrar o vaciar",
          description:
            "«Realizar venta» inicia el cobro. «Vaciar listado» limpia el carrito sin registrar nada.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: tourTarget("caja-quick-access"),
        allowMissing: true,
        dwellMs: 2400,
        popover: {
          title: "Accesos rápidos",
          description:
            "Abre la grilla de productos frecuentes para agregar al carrito más rápido.",
          side: "bottom",
          align: "end",
        },
      },
    ],
  },
  {
    id: "shifts",
    label: "Turno / caja",
    match: [appRoutes.operation.shifts],
    steps: pageIntro(
      "Turno",
      "Apertura, supervisión y cierre del turno de caja.",
    ),
  },

  // Ventas / compras — el tour «sales» de moduleTours cubre hub/historial
  {
    id: "customer-accounts",
    label: "Cuentas de clientes",
    match: [appRoutes.sales.customerAccounts],
    steps: pageIntro(
      "Cuentas de clientes",
      "Saldos, créditos y movimientos de cuenta por cliente.",
    ),
  },
  {
    id: "purchases",
    label: "Compras",
    match: [appRoutes.purchases.hub],
    steps: pageIntro(
      "Compras",
      "Registro e historial de compras e ingresos de stock.",
    ),
  },

  // Finanzas
  {
    id: "finance",
    label: "Finanzas",
    match: ["/finanzas"],
    steps: pageIntro(
      "Finanzas",
      "Gastos, sueldos, liquidaciones, cuadre y el dinero del negocio.",
    ),
  },

  // Inventario extra (productos/categorías/unidades: EntityCreate)
  {
    id: "inventory-extra",
    label: "Inventario",
    match: ["/inventario"],
    steps: pageIntro(
      "Inventario",
      "Productos, categorías, movimientos, lotes y stock por local.",
    ),
  },

  // Comprobantes / POS
  {
    id: "pos-docs",
    label: "Comprobantes POS",
    match: [
      appRoutes.operation.posReceipts,
      "/comprobantes-electronicos",
    ],
    steps: pageIntro(
      "Comprobantes POS",
      "Facturas SRI, notas, reimpresión de caja y documentos emitidos.",
    ),
  },

  // Marketing / canal
  {
    id: "marketing",
    label: "Marketing",
    match: ["/marketing", "/publicidad", "/canal"],
    steps: pageIntro(
      "Marketing y canal",
      "Promociones, publicidad y lo que se muestra en el canal público.",
    ),
  },

  // Admin
  {
    id: "branches",
    label: "Sucursales",
    match: [appRoutes.inventory.stores, appRoutes.branches.list],
    skipAuto: true,
    steps: [],
  },
  {
    id: "admin",
    label: "Administración",
    match: ["/administracion"],
    steps: pageIntro(
      "Administración",
      "Usuarios, roles, cuentas, sucursales y control del sistema.",
    ),
  },

  // Sistema (excepto configuración, que tiene gate propio)
  {
    id: "system-profile",
    label: "Perfil",
    match: [appRoutes.system.profile],
    steps: pageIntro(
      "Perfil",
      "Datos de tu cuenta, rol y preferencias personales.",
    ),
  },
  {
    id: "system-donations",
    label: "Donaciones",
    match: [appRoutes.system.donations],
    steps: pageIntro(
      "Donaciones",
      "Registro y seguimiento de donaciones del negocio.",
    ),
  },
  {
    id: "system-logs",
    label: "Logs",
    match: [appRoutes.system.logs],
    steps: pageIntro(
      "Logs del sistema",
      "Registro técnico de errores y actividad para diagnóstico.",
    ),
  },
  {
    id: "system-tutorials",
    label: "Tutoriales",
    match: [appRoutes.system.tutorials],
    steps: pageIntro(
      "Tutoriales",
      "Guías paso a paso de cada módulo del sistema.",
    ),
  },

  // Empleado / fidelización
  {
    id: "employee",
    label: "Área empleado",
    match: ["/empleado"],
    steps: pageIntro(
      "Área de empleado",
      "Tu día, agenda personal y liquidación según tu rol.",
    ),
  },
  {
    id: "loyalty",
    label: "Fidelización",
    match: [appRoutes.loyalty.hub],
    steps: pageIntro(
      "Fidelización",
      "Programa de puntos y beneficios para clientes frecuentes.",
    ),
  },
  {
    id: "shift-supervision",
    label: "Supervisión de caja",
    match: [appRoutes.operation.shiftSupervision],
    steps: pageIntro(
      "Supervisión de caja",
      "Revisa turnos abiertos, diferencias y control de caja.",
    ),
  },

  // Gates propios: no auto
  {
    id: "settings",
    label: "Configuración",
    match: [appRoutes.system.settings],
    skipAuto: true,
    steps: [],
  },
  {
    id: "inicio",
    label: "Inicio",
    match: [appRoutes.inicio],
    skipAuto: true,
    steps: [],
  },
];

/** Resuelve el tour más específico para la ruta actual. */
export function findModuleDriverTour(
  pathname: string,
): ModuleDriverTour | null {
  let best: ModuleDriverTour | null = null;
  let bestLen = -1;
  for (const tour of MODULE_DRIVER_TOURS) {
    if (!tour.steps.length && tour.skipAuto) {
      // igual cuenta para excluir auto de otros genéricos más cortos
    }
    for (const prefix of tour.match) {
      const matches =
        pathname === prefix || pathname.startsWith(`${prefix}/`);
      if (matches && prefix.length > bestLen) {
        best = tour;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}

export function getModuleDriverSteps(
  pathname: string,
): { tour: ModuleDriverTour; steps: SchedulyTourStep[] } | null {
  const tour = findModuleDriverTour(pathname);
  if (!tour || !tour.steps.length) return null;
  return { tour, steps: tour.steps };
}

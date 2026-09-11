import { appRoutes } from "@/shared/utils/app-routes";

export const ONBOARDING_VERSION = 3;
export const ONBOARDING_STORAGE_PREFIX = "scheduly-onboarding";

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  /** data-onboarding target en el DOM */
  target?: string;
  /** Ruta opcional (solo para tour global entre secciones) */
  href?: string;
  expandModule?: string;
  /** Tiempo en pantalla antes de auto-avanzar (ms). */
  dwellMs?: number;
  /** Mueve un puntero simulado y hace clic en el target (p. ej. abrir acordeón). */
  pointerClick?: boolean;
};

export type ModuleTour = {
  id: string;
  label: string;
  /** Prefijos de ruta que activan este módulo */
  match: string[];
  steps: OnboardingStep[];
};

export const moduleTours: ModuleTour[] = [
  {
    id: "dashboard",
    label: "Panel",
    match: ["/panel"],
    steps: [
      {
        id: "dash-period",
        title: "Filtro de período",
        description:
          "Cambia entre Hoy, Semana o Mes para ver ingresos y turnos del período que te interesa.",
        target: "dash-period",
      },
      {
        id: "dash-actions",
        title: "Accesos rápidos",
        description:
          "Atajos a Agenda, Clientes, Inventario y Ventas para llegar más rápido a lo diario.",
        target: "dash-actions",
      },
      {
        id: "dash-kpis",
        title: "Indicadores clave",
        description:
          "Ingresos, cantidad de turnos, tasa de cierre y clientes. El porcentaje compara con el período anterior.",
        target: "dash-kpis",
      },
      {
        id: "dash-finance",
        title: "Resumen financiero",
        description:
          "Tarjetas de ingresos y flujo del período para ver la salud del negocio de un vistazo.",
        target: "dash-finance-hero",
      },
      {
        id: "dash-status",
        title: "Distribución por estado",
        description:
          "Pasa el mouse sobre el gráfico o la leyenda para ver el detalle de cada estado (agendado, completado, etc.).",
        target: "dash-status",
      },
      {
        id: "dash-recent",
        title: "Últimos turnos",
        description:
          "Lista compacta de actividad reciente. Haz clic en un turno para ir a la agenda.",
        target: "dash-recent",
      },
      {
        id: "dash-top",
        title: "Top empleados",
        description:
          "Quién más aportó en el período: útil para reconocer rendimiento.",
        target: "dash-top-employees",
      },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    match: ["/operacion/agenda"],
    steps: [
      {
        id: "agenda-create",
        title: "Agendar turno",
        description:
          "Este botón abre el formulario para crear un nuevo turno: elige cliente, servicios, fecha y hora.",
        target: "agenda-create",
      },
      {
        id: "agenda-legend",
        title: "Leyenda de estados",
        description:
          "Cada color representa un estado del turno (agendado, por pagar, completado, cancelado…). Así lees el calendario de un vistazo.",
        target: "agenda-legend",
      },
      {
        id: "agenda-calendar",
        title: "Calendario",
        description:
          "Vista mes / semana / día. Haz clic en un día vacío para agendar, o en un turno existente para ver detalle, editar o registrar el pago.",
        target: "agenda-calendar",
      },
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    match: [
      "/ventas/ventas",
      "/ventas/historial",
      "/ventas/registrar-venta",
      "/ventas/productos-vendidos",
    ],
    steps: [
      {
        id: "sales-summary",
        title: "Hub de ventas",
        description:
          "Aquí ves productos vendidos y puedes registrar una venta con el botón +.",
        target: "sales-summary",
      },
      {
        id: "sales-filters",
        title: "Filtros y búsqueda",
        description:
          "Filtra por período y busca por cliente, producto o vendedor.",
        target: "sales-filters",
      },
      {
        id: "sales-list",
        title: "Tabla de ventas",
        description:
          "Cada fila muestra sucursal, cliente, producto y total — como en EdDeli.",
        target: "sales-list",
      },
    ],
  },
  {
    id: "customers",
    label: "Clientes",
    match: ["/ventas/clientes"],
    steps: [
      {
        id: "customers-create",
        title: "Agregar cliente",
        description:
          "Registra nombre, apellidos, teléfono y correo. Los clientes se usan al agendar turnos.",
        target: "customers-create",
      },
      {
        id: "customers-list",
        title: "Listado de clientes",
        description:
          "Busca, edita o elimina clientes. La búsqueda filtra por nombre, teléfono o correo.",
        target: "customers-list",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventario",
    match: ["/inventario/productos"],
    steps: [
      {
        id: "products-create",
        title: "Agregar producto",
        description:
          "Crea un producto con precio, stock y categoría. El stock se descuenta al completar turnos con productos.",
        target: "products-create",
      },
      {
        id: "products-list",
        title: "Listado de productos",
        description:
          "Revisa existencias. Si el stock llega al mínimo, recibirás una notificación de alerta.",
        target: "products-list",
      },
    ],
  },
  {
    id: "notifications",
    label: "Notificaciones",
    match: ["/sistema/notificaciones"],
    steps: [
      {
        id: "notif-header",
        title: "Centro de avisos",
        description:
          "Aquí ves alertas de stock, turnos y actividad. Marca como leídas una a una o todas juntas.",
        target: "notif-header",
      },
      {
        id: "notif-list",
        title: "Lista de notificaciones",
        description:
          "Las no leídas aparecen arriba. También verás un resumen flotante en cualquier pantalla mientras haya pendientes.",
        target: "notif-list",
      },
    ],
  },
];

/** Preferir `getShellTourSteps(role)` al iniciar el tour. */
export const onboardingSteps: OnboardingStep[] = [
  {
    id: "nav-inicio",
    title: "Inicio",
    description: "Portada del negocio al entrar al sistema.",
    href: appRoutes.inicio,
    target: "nav-inicio",
    expandModule: "all",
  },
];

export function onboardingStorageKey(userId: number | string) {
  return `${ONBOARDING_STORAGE_PREFIX}-u${userId}-v${ONBOARDING_VERSION}`;
}

export function moduleTourStorageKey(
  userId: number | string,
  moduleId: string,
) {
  return `${ONBOARDING_STORAGE_PREFIX}-mod-${moduleId}-u${userId}-v${ONBOARDING_VERSION}`;
}

export function findModuleTour(pathname: string): ModuleTour | null {
  let best: ModuleTour | null = null;
  let bestLen = -1;
  for (const tour of moduleTours) {
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

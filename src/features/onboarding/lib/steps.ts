import { appRoutes } from "@/shared/utils/app-routes";

export const ONBOARDING_VERSION = 2;
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
    label: "Panel de control",
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
        id: "dash-activity",
        title: "Actividad del período",
        description:
          "Gráfico de cuántos turnos hubo por día u hora. Sirve para ver picos de demanda.",
        target: "dash-activity",
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
    id: "tasks",
    label: "Tareas",
    match: ["/operacion/tareas"],
    steps: [
      {
        id: "tasks-create",
        title: "Nueva tarea",
        description:
          "Crea una tarea con título, prioridad, responsable y fecha límite. También puedes agregar desde cada columna del tablero.",
        target: "tasks-create",
      },
      {
        id: "tasks-kanban",
        title: "Tablero Kanban",
        description:
          "Tres columnas: Por hacer, En progreso y Hecho. Arrastra una tarjeta a otra columna para cambiar su estado.",
        target: "tasks-kanban",
      },
    ],
  },
  {
    id: "sales",
    label: "Registro de ventas",
    match: ["/ventas/historial"],
    steps: [
      {
        id: "sales-summary",
        title: "Resumen de ventas",
        description:
          "Total vendido del período y desglose por efectivo, tarjeta y transferencia.",
        target: "sales-summary",
      },
      {
        id: "sales-filters",
        title: "Filtros y búsqueda",
        description:
          "Filtra por Hoy / Semana / Mes y por método de pago. Busca por cliente, servicio o staff.",
        target: "sales-filters",
      },
      {
        id: "sales-list",
        title: "Historial",
        description:
          "Cada fila es un pago registrado al cerrar un turno: fecha, cliente, detalle y monto.",
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

/** Tour global corto (menú) — se usa en la bienvenida inicial */
export const onboardingSteps: OnboardingStep[] = [
  {
    id: "nav-dashboard",
    title: "Panel de control",
    description: "Resumen del salón. Al entrar a cada sección podrás ver una guía de sus botones.",
    href: appRoutes.dashboard,
    target: "nav-dashboard",
    expandModule: "dashboard",
  },
  {
    id: "nav-agenda",
    title: "Operación",
    description: "Agenda de turnos y tablero de tareas del equipo.",
    href: appRoutes.operation.agenda,
    target: "nav-agenda",
    expandModule: "operation",
  },
  {
    id: "nav-sales",
    title: "Ventas",
    description: "Historial de cobros y cartera de clientes.",
    href: appRoutes.sales.history,
    target: "nav-sales",
    expandModule: "sales",
  },
  {
    id: "nav-inventory",
    title: "Inventario",
    description: "Productos, stock y categorías.",
    href: appRoutes.inventory.products,
    target: "nav-inventory",
    expandModule: "inventory",
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

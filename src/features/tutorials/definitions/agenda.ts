import type { SchedulyTourStep } from "../core/run-tour";

export const AGENDA_OVERVIEW_TOUR_ID = "agenda-overview";
export const AGENDA_CREATE_TOUR_ID = "agenda-create";

const DEMO_TITLE = "Corte y peinado";
const DEMO_DESC = "Prefiere corte clásico; sin lavado esta vez.";

/** Tour: qué se ve en la agenda (leyenda, calendario, filtros, botón). */
export function getAgendaOverviewTourSteps(): SchedulyTourStep[] {
  return [
    {
      element: "[data-tour='agenda-help']",
      allowMissing: true,
      dwellMs: 2400,
      popover: {
        title: "Tutorial de Agenda",
        description:
          "Te mostramos las zonas de esta pantalla. El puntero señala cada parte. Avanza solo o usa Pausa / Siguiente.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='agenda-branch-filter']",
      allowMissing: true,
      dwellMs: 2600,
      popover: {
        title: "Sucursal",
        description:
          "Si eres Dueño, elige aquí el local. Sin sucursal no se puede agendar un turno.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-onboarding='agenda-legend']",
      allowMissing: true,
      dwellMs: 2800,
      popover: {
        title: "Leyenda de estados",
        description:
          "Cada color es un estado (agendado, por pagar, completado, cancelado…). Así lees el calendario de un vistazo.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-onboarding='agenda-calendar']",
      allowMissing: true,
      dwellMs: 3000,
      popover: {
        title: "Calendario",
        description:
          "Mes / semana / día. Clic en un día vacío para ver turnos o agendar; clic en un turno para detalle, editar o cobrar.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-onboarding='agenda-create']",
      allowMissing: true,
      dwellMs: 2800,
      popover: {
        title: "Agendar turno",
        description:
          "Abre el formulario de un turno nuevo. El ? de al lado te guía paso a paso con el puntero.",
        side: "bottom",
        align: "end",
      },
    },
  ];
}

/**
 * Tour: simula agendar con puntero (modal abierto).
 * Al cerrar, el formulario vuelve en blanco.
 */
export function getAgendaCreateTourSteps(): SchedulyTourStep[] {
  return [
    {
      element: "[data-tour='agenda-form-help']",
      allowMissing: true,
      dwellMs: 2400,
      popover: {
        title: "Cómo agendar un turno",
        description:
          "El puntero te muestra cada campo. Puedes usar Pausa o Siguiente a tu ritmo.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='agenda-form-title']",
      allowMissing: true,
      dwellMs: 1400,
      demo: {
        kind: "type",
        selector: "#apt-title",
        value: DEMO_TITLE,
        msPerChar: 65,
      },
      popover: {
        title: "Título",
        description: `Nombre corto del turno, por ejemplo «${DEMO_TITLE}».`,
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='agenda-form-customer']",
      allowMissing: true,
      dwellMs: 1800,
      demo: {
        kind: "pickFirst",
        openSelector: "[data-tour='agenda-form-customer'] input",
        overlayId: "customer",
      },
      popover: {
        title: "Cliente",
        description: "Busca y elige al cliente del turno.",
        // A la izquierda para no tapar la lista del select
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='agenda-form-when']",
      allowMissing: true,
      dwellMs: 2400,
      popover: {
        title: "Fecha, hora y estado",
        description: "Define cuándo será el turno y su estado inicial.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='agenda-form-description']",
      allowMissing: true,
      dwellMs: 1400,
      demo: {
        kind: "type",
        selector: "#apt-description",
        value: DEMO_DESC,
        msPerChar: 38,
      },
      popover: {
        title: "Descripción",
        description: "Detalle de ejemplo u observaciones del turno.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='agenda-service-select']",
      allowMissing: true,
      dwellMs: 1800,
      demo: {
        kind: "pickFirst",
        openSelector: "[data-tour='agenda-service-select'] input",
        overlayId: "service",
      },
      popover: {
        title: "Servicios",
        description: "Busca un servicio; verás el precio en la lista.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='agenda-product-select']",
      allowMissing: true,
      dwellMs: 1800,
      demo: {
        kind: "pickFirst",
        openSelector: "[data-tour='agenda-product-select'] input",
        overlayId: "product",
      },
      popover: {
        title: "Productos",
        description: "Busca productos; se muestra precio y stock.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='agenda-form-save']",
      allowMissing: true,
      dwellMs: 2800,
      popover: {
        title: "Guardar",
        description: "Cuando esté completo, pulsa Guardar para crear el turno.",
        side: "top",
        align: "end",
      },
    },
  ];
}

export const TUTORIAL_AGENDA_CATALOG = [
  {
    id: AGENDA_OVERVIEW_TOUR_ID,
    title: "Agenda — mapa de pantalla",
    description: "Leyenda, calendario y botón para agendar (con puntero).",
  },
  {
    id: AGENDA_CREATE_TOUR_ID,
    title: "Agenda — agendar turno",
    description: "Simula el formulario con puntero y datos de ejemplo.",
  },
];

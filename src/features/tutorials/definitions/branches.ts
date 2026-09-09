import type { SchedulyTourStep } from "../core/run-tour";
import { BRANCHES_OVERVIEW_DEMO_FORM } from "../simulation/demos/branches-team";

export const BRANCHES_OVERVIEW_TOUR_ID = "branches-overview";
export const BRANCHES_FORM_TOUR_ID = "branches-form";
export const BRANCHES_TEAM_TOUR_ID = "branches-team";

/**
 * Tour principal: vacío → abrir modal → escribir → guardar → ver local en lista (fin).
 *
 * Patrón de referencia para futuros tutoriales:
 * - Botones: demo `kind: "click"` (puntero + onda de click + acción).
 * - Campos: `type-create-form` / `kind: "type"` (puntero + onda + escribir 1 vez).
 * - No duplicar un segundo `type` tras llenar el estado; una sola escritura.
 * - La onda sale de `pointer.press()` (clase `is-pressing` en tour-theme.css).
 */
export function getBranchesOverviewTourSteps(): SchedulyTourStep[] {
  return [
    {
      element: "[data-tour='branches-help']",
      allowMissing: true,
      dwellMs: 2600,
      popover: {
        title: "Tutorial de Sucursales",
        description:
          "Simulamos empezar sin locales. Vas a crear uno de prueba y verlo en la lista. Nada se guarda de verdad.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='branches-empty']",
      allowMissing: true,
      dwellMs: 2600,
      popover: {
        title: "Sin locales",
        description:
          "Así se ve al inicio. Hay que crear el primer local del negocio.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='branches-create']",
      allowMissing: true,
      dwellMs: 1800,
      demo: {
        kind: "sequence",
        steps: [
          { kind: "click", selector: "[data-tour='branches-create']" },
          { kind: "branches", action: { type: "open-create" } },
          {
            kind: "waitFor",
            selector: "[data-tour='branches-form-name'] input",
          },
        ],
      },
      popover: {
        title: "Nuevo local",
        description: "Abrimos el formulario para crear el local.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='branches-form-name']",
      allowMissing: true,
      dwellMs: 1400,
      demo: {
        kind: "sequence",
        steps: [
          {
            kind: "waitFor",
            selector: "[data-tour='branches-form-name'] input",
          },
          {
            kind: "branches",
            action: {
              type: "type-create-form",
              field: "name",
              value: BRANCHES_OVERVIEW_DEMO_FORM.name,
              msPerChar: 50,
            },
          },
        ],
      },
      popover: {
        title: "Nombre",
        description: "Escribe el nombre del local.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-form-address']",
      allowMissing: true,
      dwellMs: 1200,
      demo: {
        kind: "sequence",
        steps: [
          {
            kind: "waitFor",
            selector: "[data-tour='branches-form-address'] input",
          },
          {
            kind: "branches",
            action: {
              type: "type-create-form",
              field: "address",
              value: BRANCHES_OVERVIEW_DEMO_FORM.address,
              msPerChar: 36,
            },
          },
        ],
      },
      popover: {
        title: "Dirección",
        description: "Agrega la dirección o referencia.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-form-phone']",
      allowMissing: true,
      dwellMs: 1100,
      demo: {
        kind: "sequence",
        steps: [
          {
            kind: "waitFor",
            selector: "[data-tour='branches-form-phone'] input",
          },
          {
            kind: "branches",
            action: {
              type: "type-create-form",
              field: "phone",
              value: BRANCHES_OVERVIEW_DEMO_FORM.phone,
              msPerChar: 45,
            },
          },
        ],
      },
      popover: {
        title: "Teléfono",
        description: "Opcional, pero útil para contacto.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-form-submit']",
      allowMissing: true,
      dwellMs: 2000,
      demo: {
        kind: "sequence",
        steps: [
          { kind: "click", selector: "[data-tour='branches-form-submit']" },
          { kind: "branches", action: { type: "submit-create" } },
          {
            kind: "waitFor",
            selector: "[data-tour='branches-list']",
            timeoutMs: 5000,
          },
        ],
      },
      popover: {
        title: "Guardar",
        description: "Creamos el local de prueba. Ya aparecerá en la lista.",
        side: "top",
        align: "end",
      },
    },
    {
      element: "[data-tour='branches-list']",
      allowMissing: true,
      dwellMs: 3200,
      popover: {
        title: "Listo: tu local",
        description:
          "Aquí quedan los locales. Para el equipo, usa Gestionar equipos y el ? dentro del panel.",
        side: "top",
        align: "center",
      },
    },
  ];
}

/**
 * Tour del modal «Nuevo local»: solo campos (no reinicia la lista desde afuera).
 */
export function getBranchesFormTourSteps(): SchedulyTourStep[] {
  return [
    {
      element: "[data-tour='branches-form-help']",
      allowMissing: true,
      dwellMs: 2400,
      popover: {
        title: "Cómo registrar un local",
        description:
          "El puntero te muestra cada campo. Puedes pausar o ir a Siguiente. Nada se guarda de verdad.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='branches-form-name']",
      allowMissing: true,
      dwellMs: 1400,
      demo: {
        kind: "sequence",
        steps: [
          {
            kind: "waitFor",
            selector: "[data-tour='branches-form-name'] input",
          },
          {
            kind: "branches",
            action: {
              type: "type-create-form",
              field: "name",
              value: BRANCHES_OVERVIEW_DEMO_FORM.name,
              msPerChar: 50,
            },
          },
        ],
      },
      popover: {
        title: "Nombre",
        description: "Escribe el nombre del local.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-form-address']",
      allowMissing: true,
      dwellMs: 1200,
      demo: {
        kind: "sequence",
        steps: [
          {
            kind: "waitFor",
            selector: "[data-tour='branches-form-address'] input",
          },
          {
            kind: "branches",
            action: {
              type: "type-create-form",
              field: "address",
              value: BRANCHES_OVERVIEW_DEMO_FORM.address,
              msPerChar: 36,
            },
          },
        ],
      },
      popover: {
        title: "Dirección",
        description: "Agrega la dirección o referencia.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-form-phone']",
      allowMissing: true,
      dwellMs: 1100,
      demo: {
        kind: "sequence",
        steps: [
          {
            kind: "waitFor",
            selector: "[data-tour='branches-form-phone'] input",
          },
          {
            kind: "branches",
            action: {
              type: "type-create-form",
              field: "phone",
              value: BRANCHES_OVERVIEW_DEMO_FORM.phone,
              msPerChar: 45,
            },
          },
        ],
      },
      popover: {
        title: "Teléfono",
        description: "Opcional, pero útil para contacto.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-form-submit']",
      allowMissing: true,
      dwellMs: 2800,
      popover: {
        title: "Guardar",
        description: "Cuando esté completo, pulsa Guardar para crear el local.",
        side: "top",
        align: "end",
      },
    },
  ];
}

/**
 * Tour simulado: modal Gestionar equipo con datos demo + clics guiados.
 * No guarda cambios reales.
 */
export function getBranchesTeamTourSteps(): SchedulyTourStep[] {
  return [
    {
      element: "[data-tour='branches-team-help']",
      allowMissing: true,
      dwellMs: 2600,
      popover: {
        title: "Simulación con datos de prueba",
        description:
          "Verás personas de ejemplo. El puntero hace clic por ti: vincular, trasladar y cambiar de local. Nada se guarda de verdad.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='branches-team-tabs']",
      allowMissing: true,
      dwellMs: 2200,
      popover: {
        title: "Pestañas por local",
        description:
          "Cada pestaña es un local. Si tienes más de uno, el puntero cambiará entre ellos.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-team-tabs'] [role='tab']:nth-child(2)",
      allowMissing: true,
      dwellMs: 2000,
      demo: {
        kind: "click",
        selector: "[data-tour='branches-team-tabs'] [role='tab']:nth-child(2)",
      },
      popover: {
        title: "Otro local",
        description:
          "Así saltas al equipo del segundo local sin cerrar el panel.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='branches-team-tabs'] [role='tab']:nth-child(1)",
      allowMissing: true,
      dwellMs: 1800,
      demo: {
        kind: "click",
        selector: "[data-tour='branches-team-tabs'] [role='tab']:nth-child(1)",
      },
      popover: {
        title: "Volver al primero",
        description: "Regresamos al local inicial para ver cómo vincular gente.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-team-manager']",
      allowMissing: true,
      dwellMs: 2600,
      popover: {
        title: "Encargado principal",
        description:
          "Solo uno por local (coronita). La Dueña manda en todo el negocio aunque no sea encargada aquí.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-team-add']",
      allowMissing: true,
      dwellMs: 1600,
      demo: {
        kind: "type",
        selector: "[data-tour='branches-team-add-select'] input",
        value: "Lucía",
        msPerChar: 70,
      },
      popover: {
        title: "Buscar persona",
        description:
          "A la izquierda escribes para filtrar. Primero salen quienes no tienen local.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-team-add-select']",
      allowMissing: true,
      dwellMs: 2000,
      demo: {
        kind: "pickFirst",
        openSelector: "[data-tour='branches-team-add-select'] input",
      },
      popover: {
        title: "Elegir de la lista",
        description: "El puntero abre el listado y elige a la persona de prueba.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-team-add-btn']",
      allowMissing: true,
      dwellMs: 2200,
      demo: {
        kind: "click",
        selector: "[data-tour='branches-team-add-btn']",
      },
      popover: {
        title: "Vincular",
        description:
          "Con Agregar la persona pasa al equipo de la derecha (en el tutorial solo es una simulación).",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='branches-team-list']",
      allowMissing: true,
      dwellMs: 2800,
      popover: {
        title: "Equipo del local",
        description:
          "Corona = encargado · Flechas = trasladar · X = quitar. Pasa el mouse para ver cada función.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-team-move']",
      allowMissing: true,
      dwellMs: 2000,
      demo: {
        kind: "click",
        selector: "[data-tour='branches-team-move']",
      },
      popover: {
        title: "Abrir traslado",
        description:
          "El icono de flechas despliega el destino. Elige otro local y confirma.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='branches-team-move-panel']",
      allowMissing: true,
      dwellMs: 2200,
      demo: {
        kind: "pickFirst",
        openSelector:
          "[data-tour='branches-team-move-panel'] [data-slot='select-trigger']",
      },
      popover: {
        title: "Local destino",
        description: "Elige a dónde se mueve la persona. Luego confirma el traslado.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='branches-team-move-confirm']",
      allowMissing: true,
      dwellMs: 2400,
      demo: {
        kind: "click",
        selector: "[data-tour='branches-team-move-confirm']",
      },
      popover: {
        title: "Confirmar traslado",
        description:
          "En uso real pediría confirmación. Aquí solo simula el movimiento (no se guarda).",
        side: "top",
        align: "end",
      },
    },
    {
      element: "[data-tour='branches-team-tabs'] [role='tab']:nth-child(2)",
      allowMissing: true,
      dwellMs: 2400,
      demo: {
        kind: "click",
        selector: "[data-tour='branches-team-tabs'] [role='tab']:nth-child(2)",
      },
      popover: {
        title: "Ver el otro local",
        description:
          "Cambia de pestaña para revisar o gestionar el equipo del otro local.",
        side: "bottom",
        align: "center",
      },
    },
  ];
}

export const TUTORIAL_BRANCHES_CATALOG = [
  {
    id: BRANCHES_OVERVIEW_TOUR_ID,
    title: "Sucursales — mapa",
    description:
      "Desde vacío: abrir modal, crear local de prueba y verlo en la lista.",
  },
  {
    id: BRANCHES_FORM_TOUR_ID,
    title: "Sucursales — campos del local",
    description: "Tutorial del modal Nuevo local: cada campo, sin reiniciar la lista.",
  },
  {
    id: BRANCHES_TEAM_TOUR_ID,
    title: "Sucursales — gestionar equipo",
    description:
      "Simula vincular, trasladar y cambiar de local con datos de prueba.",
  },
];

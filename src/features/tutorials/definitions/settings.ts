import type { SchedulyTourStep } from "../core/run-tour";
import type { SettingsTabId } from "../prefs/settings";

export const SETTINGS_TABS_TOUR_ID = "settings-tabs";
export const SETTINGS_TAB_TOUR_PREFIX = "settings-tab";

const TAB_BLURBS: Record<
  SettingsTabId,
  { title: string; description: string }
> = {
  marca: {
    title: "Marca",
    description:
      "Nombre del negocio, logo, dirección y colores de la aplicación.",
  },
  sistema: {
    title: "Sistema",
    description:
      "Horario de agenda, caja y reglas generales de operación del sistema.",
  },
  inventario: {
    title: "Inventario",
    description:
      "Opciones de stock, costos y permisos relacionados con productos y caja.",
  },
  comprobantes: {
    title: "Comprobantes",
    description:
      "Preferencias de facturación y documentos que salen desde la operación.",
  },
  publico: {
    title: "Público",
    description:
      "Qué se muestra en el canal público: catálogo, promos y reserva.",
  },
  locales: {
    title: "Locales",
    description: "Cómo se manejan sucursales y el modo multi-local.",
  },
  sri: {
    title: "Facturación SRI",
    description:
      "Certificado de firma electrónica y vista previa de la factura.",
  },
  backups: {
    title: "Backups",
    description: "Copias de seguridad y restauración de datos del sistema.",
  },
};

/**
 * Tour 1: explica la barra de pestañas (sin navegar).
 * Auto-avanza; el usuario puede Pausar o ir a Siguiente.
 */
export function getSettingsTabsTourSteps(
  tabIds: SettingsTabId[],
): SchedulyTourStep[] {
  const steps: SchedulyTourStep[] = [
    {
      element: "[data-tour='settings-help']",
      dwellMs: 2400,
      popover: {
        title: "Tutorial de Configuración",
        description:
          "Primero te mostramos qué hace cada pestaña. El tour avanza solo; usa Pausa o Siguiente a tu ritmo.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='settings-header']",
      dwellMs: 2600,
      popover: {
        title: "Configuración",
        description:
          "Aquí se define la marca, el sistema, el inventario, lo público y más — según tu rol.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-tabs']",
      dwellMs: 2800,
      popover: {
        title: "Pestañas",
        description:
          "Cada pestaña es un grupo de ajustes. Al entrar a una, verás otra guía corta de su contenido.",
        side: "bottom",
        align: "start",
      },
    },
  ];

  for (const id of tabIds) {
    const blurb = TAB_BLURBS[id];
    steps.push({
      element: `[data-tour='settings-tab-${id}']`,
      allowMissing: true,
      dwellMs: 2600,
      popover: {
        title: blurb.title,
        description: blurb.description,
        side: "bottom",
        align: "start",
      },
    });
  }

  return steps;
}

/**
 * Tour 2: contenido de la pestaña activa.
 */
export function getSettingsTabTourSteps(
  tab: SettingsTabId,
): SchedulyTourStep[] {
  const commonIntro: SchedulyTourStep = {
    element: `[data-tour='settings-tab-${tab}']`,
    dwellMs: 2200,
    popover: {
      title: TAB_BLURBS[tab].title,
      description: `Estás en ${TAB_BLURBS[tab].title}. ${TAB_BLURBS[tab].description}`,
      side: "bottom",
      align: "start",
    },
  };

  switch (tab) {
    case "marca":
      return [
        commonIntro,
        {
          element: "[data-tour='settings-marca-form']",
          dwellMs: 3200,
          popover: {
            title: "Datos del negocio",
            description:
              "Aquí editas nombre, dirección y logo. Los cambios se reflejan en documentos como la factura.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "[data-tour='settings-marca-preview']",
          dwellMs: 3000,
          popover: {
            title: "Vista previa",
            description:
              "Así se ve la marca en la factura u otros documentos. Guarda en el formulario para actualizarla.",
            side: "left",
            align: "start",
          },
        },
      ];
    case "sri":
      return [
        commonIntro,
        {
          element: "[data-tour='settings-sri-cert']",
          dwellMs: 3200,
          popover: {
            title: "Certificado SRI",
            description:
              "Subes y administras el certificado de firma electrónica y el ambiente (pruebas o producción).",
            side: "right",
            align: "start",
          },
        },
        {
          element: "[data-tour='settings-sri-preview']",
          dwellMs: 3000,
          popover: {
            title: "Vista de factura",
            description:
              "Previsualización de cómo quedará el comprobante con tus datos de negocio y SRI.",
            side: "left",
            align: "start",
          },
        },
      ];
    case "locales":
      return [
        commonIntro,
        {
          element: "[data-tour='settings-locales-panel']",
          dwellMs: 3400,
          popover: {
            title: "Multi-local",
            description:
              "Define si operas con una o varias sucursales y cómo se relacionan con el inventario.",
            side: "top",
            align: "center",
          },
        },
      ];
    case "backups":
      return [
        commonIntro,
        {
          element: "[data-tour='settings-backups']",
          dwellMs: 3400,
          popover: {
            title: "Copias de seguridad",
            description:
              "Crear, descargar o restaurar respaldos del sistema. Solo roles autorizados.",
            side: "top",
            align: "center",
          },
        },
      ];
    case "sistema":
    case "inventario":
    case "comprobantes":
    case "publico":
      return [
        commonIntro,
        {
          element: "[data-tour='settings-flags-panel']",
          dwellMs: 3400,
          popover: {
            title: "Opciones de esta pestaña",
            description:
              "Interruptores y campos de esta sección. Cada fila indica qué cambia en la operación diaria.",
            side: "top",
            align: "start",
          },
        },
        {
          element: "[data-tour='settings-flags-save']",
          dwellMs: 2800,
          allowMissing: true,
          popover: {
            title: "Guardar",
            description:
              "Cuando cambias algo, aquí confirmas para aplicar la configuración.",
            side: "top",
            align: "end",
          },
        },
      ];
    default:
      return [commonIntro];
  }
}

export const TUTORIAL_SETTINGS_CATALOG = [
  {
    id: SETTINGS_TABS_TOUR_ID,
    title: "Configuración · pestañas",
    description: "Qué hace cada pestaña de Configuración.",
  },
];

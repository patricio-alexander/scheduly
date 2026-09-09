import type { SchedulyTourStep } from "../../core/run-tour";

/**
 * Config de tour «vacío → modal → escribir → guardar → lista».
 * Convención: puntero + onda en cada click/type (ver run-tour / tour-theme).
 */
export type EntityCreateFieldConfig = {
  /** Sufijo data-tour: `${prefix}-form-${key}` */
  key: string;
  label: string;
  description: string;
  /** Valor a tipear (demo type). Vacío si pickFirst/none. */
  value?: string;
  msPerChar?: number;
  /** input | textarea (default input) */
  control?: "input" | "textarea";
  /**
   * type = escribir (default);
   * pickFirst = abrir select/combo y elegir primera opción real;
   * none = solo explicar (puntero al campo).
   */
  demo?: "type" | "pickFirst" | "none";
  side?: "top" | "bottom" | "left" | "right";
  dwellMs?: number;
};

export type EntityCreateTourConfig = {
  /** Id persistido en prefs (ej. roles-create). */
  tourId: string;
  /** Prefijo data-tour: roles, customers, categories… */
  prefix: string;
  moduleId: string;
  helpTitle: string;
  helpDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  createTitle: string;
  createDescription: string;
  submitTitle?: string;
  submitDescription?: string;
  listTitle: string;
  listDescription: string;
  fields: EntityCreateFieldConfig[];
};

export function entityTourSel(prefix: string, part: string) {
  return `[data-tour='${prefix}-${part}']`;
}

function fieldControlSelector(
  prefix: string,
  field: EntityCreateFieldConfig,
): string {
  const wrap = entityTourSel(prefix, `form-${field.key}`);
  const tag = field.control === "textarea" ? "textarea" : "input";
  return `${wrap} ${tag}`;
}

function buildFieldTourSteps(
  prefix: string,
  fields: EntityCreateFieldConfig[],
): SchedulyTourStep[] {
  return fields.map((field) => {
    const wrap = entityTourSel(prefix, `form-${field.key}`);
    const input = fieldControlSelector(prefix, field);
    const demoKind = field.demo ?? "type";
    let demo: SchedulyTourStep["demo"];

    if (demoKind === "none") {
      demo = undefined;
    } else if (demoKind === "pickFirst") {
      demo = {
        kind: "sequence",
        steps: [
          { kind: "waitFor", selector: wrap, timeoutMs: 4000 },
          {
            kind: "pickFirst",
            openSelector: `${wrap} input, ${wrap} button, ${wrap} [data-slot='combo-box-trigger']`,
          },
        ],
      };
    } else {
      demo = {
        kind: "sequence",
        steps: [
          { kind: "waitFor", selector: input },
          {
            kind: "type",
            selector: input,
            value: field.value ?? "",
            msPerChar: field.msPerChar ?? 48,
          },
        ],
      };
    }

    return {
      element: wrap,
      allowMissing: true,
      dwellMs: field.dwellMs ?? (demoKind === "pickFirst" ? 1800 : 1200),
      demo,
      popover: {
        title: field.label,
        description: field.description,
        side: field.side ?? "bottom",
        align: "start" as const,
      },
    };
  });
}

/**
 * Construye pasos overview estilo Sucursales para cualquier entidad con modal de alta.
 * Solo para el ? de la PÁGINA (vacío → abrir → escribir → guardar → lista).
 */
export function buildEntityCreateTourSteps(
  cfg: EntityCreateTourConfig,
): SchedulyTourStep[] {
  const p = cfg.prefix;
  const firstField = cfg.fields[0];
  const firstInput = firstField
    ? fieldControlSelector(p, firstField)
    : entityTourSel(p, "form-submit");
  const fieldSteps = buildFieldTourSteps(p, cfg.fields);

  return [
    {
      element: entityTourSel(p, "help"),
      allowMissing: true,
      dwellMs: 2600,
      popover: {
        title: cfg.helpTitle,
        description: cfg.helpDescription,
        side: "bottom",
        align: "end",
      },
    },
    {
      element: entityTourSel(p, "empty"),
      allowMissing: true,
      dwellMs: 2400,
      popover: {
        title: cfg.emptyTitle,
        description: cfg.emptyDescription,
        side: "top",
        align: "center",
      },
    },
    {
      element: entityTourSel(p, "create"),
      allowMissing: true,
      dwellMs: 1800,
      demo: {
        kind: "sequence",
        steps: [
          { kind: "click", selector: entityTourSel(p, "create") },
          {
            kind: "entity",
            action: { moduleId: cfg.moduleId, type: "open-create" },
          },
          {
            kind: "waitFor",
            selector: firstInput,
            timeoutMs: 5000,
          },
        ],
      },
      popover: {
        title: cfg.createTitle,
        description: cfg.createDescription,
        side: "bottom",
        align: "end",
      },
    },
    ...fieldSteps,
    {
      element: entityTourSel(p, "form-submit"),
      allowMissing: true,
      dwellMs: 2000,
      demo: {
        kind: "sequence",
        steps: [
          { kind: "click", selector: entityTourSel(p, "form-submit") },
          {
            kind: "entity",
            action: { moduleId: cfg.moduleId, type: "submit-create" },
          },
          {
            kind: "waitFor",
            selector: entityTourSel(p, "list"),
            timeoutMs: 5000,
          },
        ],
      },
      popover: {
        title: cfg.submitTitle ?? "Guardar",
        description:
          cfg.submitDescription ??
          "Guardamos el registro de prueba. Ya aparecerá en la lista.",
        side: "top",
        align: "end",
      },
    },
    {
      element: entityTourSel(p, "list"),
      allowMissing: true,
      dwellMs: 3200,
      popover: {
        title: cfg.listTitle,
        description: cfg.listDescription,
        side: "top",
        align: "center",
      },
    },
  ];
}

/**
 * Tour del MODAL: solo campos del formulario (no vacía la lista ni reinicia la página).
 * Como Agenda create: puntero + tipeo + explicar Guardar (sin submit demo).
 */
export function buildEntityFormTourSteps(
  cfg: EntityCreateTourConfig,
): SchedulyTourStep[] {
  const p = cfg.prefix;
  const fieldSteps = buildFieldTourSteps(p, cfg.fields);

  return [
    {
      element: entityTourSel(p, "form-help"),
      allowMissing: true,
      dwellMs: 2400,
      popover: {
        title: `Cómo registrar: ${cfg.createTitle}`,
        description:
          "El puntero te muestra cada campo del formulario. Puedes pausar o ir a Siguiente. Nada se guarda de verdad.",
        side: "bottom",
        align: "end",
      },
    },
    ...fieldSteps,
    {
      element: entityTourSel(p, "form-submit"),
      allowMissing: true,
      dwellMs: 2800,
      popover: {
        title: cfg.submitTitle ?? "Guardar",
        description:
          "Cuando esté completo, pulsa Guardar para crear el registro.",
        side: "top",
        align: "end",
      },
    },
  ];
}

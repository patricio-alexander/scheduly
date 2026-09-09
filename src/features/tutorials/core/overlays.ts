/**
 * El motor del tour abre/cierra overlays del form sin Escape
 * (Escape cierra el tour de driver.js).
 */
export const TOUR_CLOSE_OVERLAYS_EVENT = "scheduly-tour-close-overlays";
export const TOUR_OPEN_OVERLAY_EVENT = "scheduly-tour-open-overlay";
export const TOUR_BRANCHES_ACTION_EVENT = "scheduly-tour-branches-action";
/** Acciones genéricas de alta de entidad (roles, clientes, productos…). */
export const TOUR_ENTITY_ACTION_EVENT = "scheduly-tour-entity-action";

export type TourOverlayId = "customer" | "status" | "service" | "product";

/**
 * Alta demo genérica (modal Agregar X).
 * open-create: abre modal vía React (HeroUI onPress no siempre responde a click DOM).
 * submit-create: inserta ítem demo en lista override, sin API.
 */
export type TourEntityAction =
  | { moduleId: string; type: "open-create" }
  | { moduleId: string; type: "submit-create" };

export type TourBranchesAction =
  | { type: "open-create" }
  | {
      type: "set-create-form";
      name?: string;
      address?: string;
      phone?: string;
    }
  | {
      /**
       * Escribe en el form de crear local con puntero + onda de click + tipeo.
       * run-tour hace moveTo → press (ripple) → focus → caracteres (una pasada).
       */
      type: "type-create-form";
      field: "name" | "address" | "phone";
      value: string;
      msPerChar?: number;
      /** Selector del input; por defecto según field. */
      selector?: string;
    }
  | { type: "submit-create" };

export function requestTourCloseOverlays() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOUR_CLOSE_OVERLAYS_EVENT));
}

export function requestTourOpenOverlay(id: TourOverlayId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOUR_OPEN_OVERLAY_EVENT, { detail: { id } }),
  );
}

export function requestTourBranchesAction(action: TourBranchesAction) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOUR_BRANCHES_ACTION_EVENT, { detail: action }),
  );
}

export function requestTourEntityAction(action: TourEntityAction) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOUR_ENTITY_ACTION_EVENT, { detail: action }),
  );
}

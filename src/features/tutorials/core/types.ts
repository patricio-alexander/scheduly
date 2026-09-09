import type { SchedulyTourStep } from "./run-tour";

/**
 * Modo de ejecución de un tutorial / corrida.
 *
 * - guide: solo resalta UI (driver.js), sin mutar datos.
 * - demo: simula interacción con datos falsos (no API / IDs negativos).
 * - live: simula interacción creando/usando datos reales vía rutas y API.
 */
export type TourRunMode = "guide" | "demo" | "live";

/** Entrada de catálogo (lab / listados). */
export type TourCatalogEntry = {
  id: string;
  title: string;
  description: string;
};

/**
 * Definición estable de un tour: id + pasos + metadatos de ejecución.
 * Las factories (`get*TourSteps`) producen esto o solo los steps.
 */
export type TourDefinition = {
  id: string;
  title: string;
  description?: string;
  /** Ruta(s) donde tiene sentido correrlo. */
  routes?: string[];
  /** Modo preferido; el runner puede forzar otro. */
  preferredMode?: TourRunMode;
  /** Si true, el orquestador global no auto-arranca (gate propio). */
  skipAuto?: boolean;
  steps: SchedulyTourStep[];
};

/** Contrato prepare/cleanup que usan los gates en modo demo. */
export type TourDemoAdapters = {
  prepareTour?: () => void;
  cleanupTour?: () => void;
  openCreateForm?: () => void;
  resetFormTour?: () => void;
};

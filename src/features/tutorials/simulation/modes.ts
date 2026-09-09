import type { TourRunMode } from "../core/types";

/**
 * Capas de simulación reutilizables por los runners.
 *
 * guide → highlight (definitions + core/run-tour)
 * demo  → datos falsos (simulation/demos + hooks + eventos overlays)
 * live  → datos reales (pickFirst / submit real / navegación appRoutes)
 */
export const TOUR_RUN_MODE_LABELS: Record<TourRunMode, string> = {
  guide: "Guía",
  demo: "Simulación (datos de prueba)",
  live: "Simulación (datos reales)",
};

export function isTourRunMode(value: unknown): value is TourRunMode {
  return value === "guide" || value === "demo" || value === "live";
}

/**
 * Cómo interpretar demos embebidos en steps según el modo.
 * - guide: ignora `demo` (solo popover)
 * - demo / live: ejecuta `demo` (live usa pickFirst/API; demo usa datasets falsos)
 */
export function shouldRunStepDemos(mode: TourRunMode): boolean {
  return mode === "demo" || mode === "live";
}

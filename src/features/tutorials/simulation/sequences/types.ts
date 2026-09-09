import type { TourRunMode } from "../../core/types";

/**
 * Un paso de una corrida multi-módulo: navegar a ruta y lanzar un tour.
 * Pensado para reutilizar los mismos catalogs/gates en playlists.
 */
export type TourSequenceStep = {
  /** Id estable del paso dentro de la secuencia. */
  id: string;
  /** Ruta de la app (appRoutes…). */
  route: string;
  /**
   * Id del tour a lanzar en esa pantalla (prefs / gate / registry).
   * Si omitís, el orquestador usa el tour por defecto de la ruta.
   */
  tourId?: string;
  /** Modo de esta etapa. */
  mode?: TourRunMode;
  /** Espera extra tras navegar antes de arrancar el tour (ms). */
  settleMs?: number;
  /** Descripción corta para lab / logs. */
  label?: string;
};

export type TourSequence = {
  id: string;
  title: string;
  description: string;
  /** Modo por defecto de los pasos que no definen uno. */
  defaultMode?: TourRunMode;
  steps: TourSequenceStep[];
};

export type TourSequenceRunnerOptions = {
  sequence: TourSequence;
  /** Navegación (Next router.push o location.assign). */
  navigate: (route: string) => void | Promise<void>;
  /**
   * Dispara el tour en la pantalla actual.
   * Por defecto: CustomEvent START_MODULE_TOUR_EVENT.
   */
  startTour?: (tourId?: string) => void;
  /** Abortar la corrida. */
  signal?: AbortSignal;
  onStepStart?: (step: TourSequenceStep, index: number) => void;
  onStepDone?: (step: TourSequenceStep, index: number) => void;
  onDone?: () => void;
  onError?: (error: unknown, step?: TourSequenceStep) => void;
};

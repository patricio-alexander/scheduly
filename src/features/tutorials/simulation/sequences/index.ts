import { START_MODULE_TOUR_EVENT } from "../../gates/ModuleTutorialOrchestrator";
import type { TourSequenceRunnerOptions, TourSequenceStep } from "./types";

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function defaultStartTour(tourId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(START_MODULE_TOUR_EVENT, {
      detail: tourId ? { tourId } : undefined,
    }),
  );
}

/**
 * Corre una playlist multi-módulo: navega → espera settle → lanza tour.
 *
 * Nota: hoy el fin de cada tour no se observa de forma fiable desde fuera
 * (los gates marcan seen al destruir). Por eso cada paso solo espera
 * `settleMs` + un dwell fijo tras startTour. Cuando los gates expongan
 * `onTourDestroyed`, se podrá encadenar de verdad.
 */
export async function runTourSequence(
  opts: TourSequenceRunnerOptions,
): Promise<void> {
  const {
    sequence,
    navigate,
    startTour = defaultStartTour,
    signal,
    onStepStart,
    onStepDone,
    onDone,
    onError,
  } = opts;

  try {
    for (let i = 0; i < sequence.steps.length; i++) {
      if (signal?.aborted) break;
      const step: TourSequenceStep = sequence.steps[i]!;
      onStepStart?.(step, i);
      await navigate(step.route);
      await sleep(step.settleMs ?? 600, signal);
      startTour(step.tourId);
      // Tiempo mínimo en pantalla antes de saltar al siguiente módulo.
      await sleep(4200, signal);
      onStepDone?.(step, i);
    }
    onDone?.();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    onError?.(err);
  }
}

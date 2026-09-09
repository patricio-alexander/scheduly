"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { Driver } from "driver.js";
import { getModuleDriverSteps } from "../definitions/modules";
import {
  isModuleTourSeen,
  markModuleTourSeen,
} from "../prefs/module";
import { runSchedulyTour } from "../core/run-tour";

export const START_MODULE_TOUR_EVENT = "scheduly:start-module-tour";

/**
 * Orquestador global: en cada pantalla del panel lanza el tour driver.js
 * (auto la 1ª vez; relanzable con el ? del header).
 * Login / Inicio / Configuración tienen gates propios y se omiten aquí.
 */
export function ModuleTutorialOrchestrator() {
  const pathname = usePathname();
  const instanceRef = useRef<Driver | null>(null);
  const runningRef = useRef(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const stop = useCallback(() => {
    try {
      instanceRef.current?.destroy();
    } catch {
      /* ignore */
    }
    instanceRef.current = null;
    runningRef.current = false;
  }, []);

  const startForPath = useCallback(
    (path: string, opts?: { force?: boolean }) => {
      const resolved = getModuleDriverSteps(path);
      if (!resolved) return false;
      const { tour, steps } = resolved;
      if (!opts?.force && isModuleTourSeen(tour.id)) return false;
      if (runningRef.current) stop();

      runningRef.current = true;
      // Espera a que la vista pinte targets data-onboarding
      window.setTimeout(() => {
        if (pathRef.current !== path) {
          runningRef.current = false;
          return;
        }
        instanceRef.current = runSchedulyTour({
          steps,
          autoPlay: true,
          autoPlayMs: 2800,
          onDestroyed: () => {
            markModuleTourSeen(tour.id);
            instanceRef.current = null;
            runningRef.current = false;
          },
        });
        if (!instanceRef.current) {
          // Sin targets visibles: marcar visto para no spamear
          markModuleTourSeen(tour.id);
          runningRef.current = false;
        }
      }, 450);
      return true;
    },
    [stop],
  );

  // Auto al entrar a una pantalla nueva
  useEffect(() => {
    const resolved = getModuleDriverSteps(pathname);
    if (!resolved || resolved.tour.skipAuto) return;
    if (isModuleTourSeen(resolved.tour.id)) return;

    const t = window.setTimeout(() => {
      startForPath(pathname);
    }, 800);
    return () => {
      window.clearTimeout(t);
      // Al cambiar de ruta, corta el tour anterior
      stop();
    };
  }, [pathname, startForPath, stop]);

  // Relanzar desde el header (?)
  useEffect(() => {
    const onStart = () => {
      startForPath(pathRef.current, { force: true });
    };
    window.addEventListener(START_MODULE_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_MODULE_TOUR_EVENT, onStart);
  }, [startForPath]);

  useEffect(() => () => stop(), [stop]);

  return null;
}

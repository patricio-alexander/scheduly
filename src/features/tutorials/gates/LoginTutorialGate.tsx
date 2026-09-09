"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal, useOverlayState } from "@heroui/react";
import CircleQuestion from "@gravity-ui/icons/CircleQuestion";
import CirclePlay from "@gravity-ui/icons/CirclePlay";
import type { Driver } from "driver.js";
import { getLoginTourSteps, LOGIN_TOUR_ID } from "../definitions/login";
import {
  readLoginTutorialPrefs,
  writeLoginTutorialPrefs,
} from "../prefs/login";
import { runSchedulyTour } from "../core/run-tour";

type Props = {
  /** Arranca al montar (p. ej. ?tutorial=1 desde el lab del programador). */
  autoStart?: boolean;
};

/** Quita ?tutorial= de la barra para que un F5 no vuelva a forzar el tour. */
function stripTutorialQueryParam() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("tutorial")) return;
    url.searchParams.delete("tutorial");
    const qs = url.searchParams.toString();
    const next = `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
    window.history.replaceState(window.history.state, "", next);
  } catch {
    /* ignore */
  }
}

/**
 * Login: primera visita sugiere el tour; el icono ? lo relanza (driver.js).
 * Tras verlo o cerrarlo, se guarda en localStorage y no se auto-muestra.
 */
export function LoginTutorialGate({ autoStart = false }: Props) {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const instanceRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);

  const persistDismissed = useCallback((completed = false) => {
    writeLoginTutorialPrefs({
      suggested: true,
      ...(completed ? { completed: true } : {}),
    });
  }, []);

  const suggest = useOverlayState({
    onOpenChange: (open) => {
      // Cerrar modal (X, fondo, Ahora no) = ya no insistir
      if (!open) persistDismissed(false);
    },
  });

  const stopTour = useCallback(() => {
    try {
      instanceRef.current?.destroy();
    } catch {
      /* ignore */
    }
    instanceRef.current = null;
    setRunning(false);
  }, []);

  const startTour = useCallback(() => {
    if (startedRef.current && instanceRef.current?.isActive()) return;
    startedRef.current = true;
    persistDismissed(false);
    stripTutorialQueryParam();
    suggest.close();
    stopTour();
    setRunning(true);

    window.setTimeout(() => {
      instanceRef.current = runSchedulyTour({
        steps: getLoginTourSteps(),
        autoPlay: true,
        autoPlayMs: 2800,
        onDestroyed: () => {
          persistDismissed(true);
          stripTutorialQueryParam();
          instanceRef.current = null;
          startedRef.current = false;
          setRunning(false);
        },
      });
      if (!instanceRef.current) {
        startedRef.current = false;
        setRunning(false);
      }
    }, 80);
  }, [suggest, stopTour, persistDismissed]);

  useEffect(() => {
    const prefs = readLoginTutorialPrefs();
    setReady(true);

    // ?tutorial=1 fuerza una vez (lab); luego se limpia la URL.
    if (autoStart) {
      persistDismissed(false);
      stripTutorialQueryParam();
      const t = window.setTimeout(() => startTour(), 400);
      return () => window.clearTimeout(t);
    }

    if (!prefs.suggested) {
      const t = window.setTimeout(() => suggest.open(), 700);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => () => stopTour(), [stopTour]);

  const declineSuggest = useCallback(() => {
    persistDismissed(false);
    stripTutorialQueryParam();
    suggest.close();
  }, [suggest, persistDismissed]);

  if (!ready) return null;

  return (
    <>
      <button
        type="button"
        data-tour="login-help"
        data-tutorial-launcher
        onClick={startTour}
        disabled={running}
        className="absolute top-3 right-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-separator bg-surface text-muted shadow-sm transition-colors hover:border-accent/40 hover:text-accent hover:bg-accent/10 disabled:opacity-50"
        title="Ver tutorial de inicio de sesión"
        aria-label="Ver tutorial de inicio de sesión"
      >
        <CircleQuestion width={18} height={18} />
      </button>

      <Modal state={suggest}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>¿Cómo iniciar sesión?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted leading-relaxed">
                  Verás cómo se llenan datos de prueba. El tour avanza solo, o
                  usa <strong>Pausa</strong> / <strong>Siguiente</strong> a tu
                  ritmo.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex flex-wrap gap-2 justify-end">
                <Button variant="secondary" onPress={declineSuggest}>
                  Ahora no
                </Button>
                <Button
                  variant="primary"
                  onPress={startTour}
                  className="gap-2"
                >
                  <CirclePlay width={16} height={16} />
                  Ver tutorial
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

export { LOGIN_TOUR_ID };

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal, useOverlayState } from "@heroui/react";
import CircleQuestion from "@gravity-ui/icons/CircleQuestion";
import CirclePlay from "@gravity-ui/icons/CirclePlay";
import type { Driver } from "driver.js";
import {
  getSettingsTabTourSteps,
  getSettingsTabsTourSteps,
  SETTINGS_TABS_TOUR_ID,
} from "../definitions/settings";
import {
  markSettingsTabSeen,
  readSettingsTutorialPrefs,
  writeSettingsTutorialPrefs,
  type SettingsTabId,
} from "../prefs/settings";
import { runSchedulyTour } from "../core/run-tour";
import { START_MODULE_TOUR_EVENT } from "./ModuleTutorialOrchestrator";

type Props = {
  activeTab: SettingsTabId;
  /** Pestañas visibles para este rol (orden de la barra). */
  tabIds: SettingsTabId[];
  /** Fuerza el tour de pestañas (p. ej. ?tutorial=1). */
  autoStartTabs?: boolean;
};

/**
 * Configuración (driver.js):
 * 1) Tour de pestañas (mapa) — auto la 1ª vez
 * 2) Tour del contenido de cada pestaña — auto la 1ª vez en esa tab
 * Avanza solo; Pausa / Siguiente como en login.
 */
export function SettingsTutorialGate({
  activeTab,
  tabIds,
  autoStartTabs = false,
}: Props) {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const instanceRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);
  const lastTabTourRef = useRef<string | null>(null);
  const suggestCancelledRef = useRef(false);
  const suggest = useOverlayState({
    onOpenChange: (open) => {
      if (!open) {
        writeSettingsTutorialPrefs({ tabsOverviewSuggested: true });
      }
    },
  });

  const stopTour = useCallback(() => {
    try {
      instanceRef.current?.destroy();
    } catch {
      /* ignore */
    }
    instanceRef.current = null;
    startedRef.current = false;
    setRunning(false);
  }, []);

  const startTabsTour = useCallback(() => {
    if (startedRef.current && instanceRef.current?.isActive()) return;
    startedRef.current = true;
    writeSettingsTutorialPrefs({ tabsOverviewSuggested: true });
    suggest.close();
    stopTour();
    setRunning(true);

    window.setTimeout(() => {
      instanceRef.current = runSchedulyTour({
        steps: getSettingsTabsTourSteps(tabIds),
        autoPlay: true,
        autoPlayMs: 2600,
        onDestroyed: () => {
          writeSettingsTutorialPrefs({
            tabsOverviewSuggested: true,
            tabsOverviewCompleted: true,
          });
          instanceRef.current = null;
          startedRef.current = false;
          setRunning(false);
        },
      });
      if (!instanceRef.current) {
        startedRef.current = false;
        setRunning(false);
      }
    }, 100);
  }, [suggest, stopTour, tabIds]);

  const startTabContentTour = useCallback(
    (tab: SettingsTabId) => {
      if (startedRef.current && instanceRef.current?.isActive()) return;
      startedRef.current = true;
      lastTabTourRef.current = tab;
      stopTour();
      setRunning(true);

      window.setTimeout(() => {
        instanceRef.current = runSchedulyTour({
          steps: getSettingsTabTourSteps(tab),
          autoPlay: true,
          autoPlayMs: 2800,
          onDestroyed: () => {
            markSettingsTabSeen(tab);
            instanceRef.current = null;
            startedRef.current = false;
            setRunning(false);
          },
        });
        if (!instanceRef.current) {
          startedRef.current = false;
          setRunning(false);
          markSettingsTabSeen(tab);
        }
      }, 120);
    },
    [stopTour],
  );

  // Primera visita: sugiere / auto-arranca mapa de pestañas
  useEffect(() => {
    const prefs = readSettingsTutorialPrefs();
    setReady(true);

    if (autoStartTabs) {
      const t = window.setTimeout(() => startTabsTour(), 500);
      return () => window.clearTimeout(t);
    }

    if (!prefs.tabsOverviewSuggested) {
      const t = window.setTimeout(() => suggest.open(), 600);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount
  }, []);

  // Auto tour de contenido al cambiar de pestaña (si el mapa ya se ofreció)
  useEffect(() => {
    if (!ready || running) return;
    const prefs = readSettingsTutorialPrefs();
    if (!prefs.tabsOverviewSuggested) return;
    if (prefs.tabsSeen[activeTab]) return;
    if (lastTabTourRef.current === activeTab && startedRef.current) return;

    const t = window.setTimeout(() => {
      // Evita solapar con el modal de pestañas
      if (suggest.isOpen) return;
      startTabContentTour(activeTab);
    }, 700);
    return () => window.clearTimeout(t);
  }, [activeTab, ready, running, startTabContentTour, suggest.isOpen]);

  useEffect(() => () => stopTour(), [stopTour]);

  // Relanzar desde el ? del header global
  useEffect(() => {
    const onStart = () => startTabsTour();
    window.addEventListener(START_MODULE_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_MODULE_TOUR_EVENT, onStart);
  }, [startTabsTour]);

  const declineSuggest = useCallback(() => {
    suggestCancelledRef.current = true;
    writeSettingsTutorialPrefs({ tabsOverviewSuggested: true });
    suggest.close();
  }, [suggest]);

  // Auto-start del mapa tras abrir el modal (como login)
  useEffect(() => {
    if (!suggest.isOpen) return;
    suggestCancelledRef.current = false;
    const t = window.setTimeout(() => {
      if (!suggestCancelledRef.current && suggest.isOpen) startTabsTour();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [suggest.isOpen, startTabsTour]);

  if (!ready) return null;

  return (
    <>
      <button
        type="button"
        data-tour="settings-help"
        onClick={startTabsTour}
        disabled={running}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-separator bg-surface text-muted shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent disabled:opacity-50"
        title="Tutorial de configuración"
        aria-label="Tutorial de configuración"
      >
        <CircleQuestion width={18} height={18} />
      </button>

      <Modal state={suggest}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>¿Cómo usar Configuración?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm leading-relaxed text-muted">
                  Te mostramos cada pestaña automáticamente. Puedes{" "}
                  <strong>Pausa</strong> o <strong>Siguiente</strong>. Luego, en
                  cada pestaña, una guía corta de su contenido.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onPress={declineSuggest}>
                  Ahora no
                </Button>
                <Button
                  variant="primary"
                  onPress={startTabsTour}
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

export { SETTINGS_TABS_TOUR_ID };

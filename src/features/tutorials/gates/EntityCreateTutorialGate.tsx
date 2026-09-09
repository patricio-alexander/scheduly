"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CircleQuestion from "@gravity-ui/icons/CircleQuestion";
import type { Driver } from "driver.js";
import {
  getEntityCreateTourId,
  getEntityCreateTourSteps,
  getEntityFormTourId,
  getEntityFormTourSteps,
  type EntityCreateModuleId,
} from "../definitions/entity-create/catalog";
import {
  isModuleTourSeen,
  markModuleTourSeen,
} from "../prefs/module";
import { runSchedulyTour } from "../core/run-tour";
import { START_MODULE_TOUR_EVENT } from "./ModuleTutorialOrchestrator";

type Ctx = {
  running: boolean;
  /** Tour de página: vacío → crear → lista. */
  startOverview: () => void;
  /** Tour del modal: solo campos (no reinicia la pantalla). */
  startForm: () => void;
  moduleId: EntityCreateModuleId;
};

const EntityCreateTutorialContext = createContext<Ctx | null>(null);

type ProviderProps = {
  children: ReactNode;
  moduleId: EntityCreateModuleId;
  /** Prepara lista vacía demo (solo overview). */
  prepareTour?: () => void;
  /** Restaura lista real (solo overview). */
  cleanupTour?: () => void;
  /** Abre el modal de alta (tour del formulario). */
  openCreateForm?: () => void;
  /** Limpia/cierra el form al terminar el tour del modal. */
  resetFormTour?: () => void;
  enabled?: boolean;
};

/**
 * Dos tutoriales distintos (como Agenda):
 * - ? de página / auto / header global → overview
 * - ? dentro del modal → solo campos del formulario
 */
export function EntityCreateTutorialProvider({
  children,
  moduleId,
  prepareTour,
  cleanupTour,
  openCreateForm,
  resetFormTour,
  enabled = true,
}: ProviderProps) {
  const [running, setRunning] = useState(false);
  const instanceRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);
  const prepareRef = useRef(prepareTour);
  prepareRef.current = prepareTour;
  const cleanupRef = useRef(cleanupTour);
  cleanupRef.current = cleanupTour;
  const openCreateRef = useRef(openCreateForm);
  openCreateRef.current = openCreateForm;
  const resetFormRef = useRef(resetFormTour);
  resetFormRef.current = resetFormTour;

  const overviewTourId = getEntityCreateTourId(moduleId);
  const formTourId = getEntityFormTourId(moduleId);

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

  const startOverview = useCallback(() => {
    if (!enabled) return;
    if (startedRef.current && instanceRef.current?.isActive()) return;
    stopTour();
    startedRef.current = true;
    setRunning(true);
    prepareRef.current?.();
    window.setTimeout(() => {
      instanceRef.current = runSchedulyTour({
        steps: getEntityCreateTourSteps(moduleId),
        autoPlay: true,
        autoPlayMs: 2600,
        showPointer: true,
        popoverOffset: 14,
        onDestroyed: () => {
          markModuleTourSeen(overviewTourId);
          markModuleTourSeen(moduleId);
          cleanupRef.current?.();
          instanceRef.current = null;
          startedRef.current = false;
          setRunning(false);
        },
      });
      if (!instanceRef.current) {
        cleanupRef.current?.();
        startedRef.current = false;
        setRunning(false);
      }
    }, 280);
  }, [enabled, moduleId, stopTour, overviewTourId]);

  const startForm = useCallback(() => {
    if (!enabled) return;
    if (startedRef.current && instanceRef.current?.isActive()) return;
    stopTour();
    startedRef.current = true;
    setRunning(true);
    // Abrir modal de alta; NO vaciar la lista ni correr el overview.
    openCreateRef.current?.();
    window.setTimeout(() => {
      instanceRef.current = runSchedulyTour({
        steps: getEntityFormTourSteps(moduleId),
        autoPlay: true,
        autoPlayMs: 2400,
        showPointer: true,
        popoverOffset: 14,
        onDestroyed: () => {
          markModuleTourSeen(formTourId);
          resetFormRef.current?.();
          instanceRef.current = null;
          startedRef.current = false;
          setRunning(false);
        },
      });
      if (!instanceRef.current) {
        resetFormRef.current?.();
        startedRef.current = false;
        setRunning(false);
      }
    }, 450);
  }, [enabled, moduleId, stopTour, formTourId]);

  useEffect(() => {
    if (!enabled) return;
    if (isModuleTourSeen(overviewTourId) || isModuleTourSeen(moduleId)) return;
    const t = window.setTimeout(() => startOverview(), 900);
    return () => window.clearTimeout(t);
  }, [enabled, moduleId, startOverview, overviewTourId]);

  useEffect(() => {
    if (!enabled) return;
    const onStart = () => startOverview();
    window.addEventListener(START_MODULE_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_MODULE_TOUR_EVENT, onStart);
  }, [enabled, startOverview]);

  useEffect(() => () => stopTour(), [stopTour]);

  const value = useMemo(
    () => ({ running, startOverview, startForm, moduleId }),
    [running, startOverview, startForm, moduleId],
  );

  return (
    <EntityCreateTutorialContext.Provider value={value}>
      {children}
    </EntityCreateTutorialContext.Provider>
  );
}

function useEntityCreateTutorial() {
  const ctx = useContext(EntityCreateTutorialContext);
  if (!ctx) {
    throw new Error(
      "EntityCreateHelpButton debe usarse dentro de EntityCreateTutorialProvider",
    );
  }
  return ctx;
}

const helpBtnClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-separator bg-surface text-muted shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent disabled:opacity-50";

const helpBtnClassModal =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-separator bg-surface text-muted shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent disabled:opacity-50";

/**
 * ? de página → overview (vacío → lista).
 * ? inModal → solo campos del formulario.
 */
export function EntityCreateHelpButton({
  title,
  inModal = false,
}: {
  title?: string;
  inModal?: boolean;
}) {
  const { running, startOverview, startForm, moduleId } =
    useEntityCreateTutorial();
  const label =
    title ??
    (inModal ? "Tutorial: campos del formulario" : "Tutorial de la pantalla");
  return (
    <button
      type="button"
      data-tour={inModal ? `${moduleId}-form-help` : `${moduleId}-help`}
      onClick={inModal ? startForm : startOverview}
      disabled={running}
      className={inModal ? helpBtnClassModal : helpBtnClass}
      title={label}
      aria-label={label}
    >
      <CircleQuestion width={inModal ? 16 : 18} height={inModal ? 16 : 18} />
    </button>
  );
}

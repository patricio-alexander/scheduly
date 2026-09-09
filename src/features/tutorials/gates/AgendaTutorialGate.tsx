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
  AGENDA_CREATE_TOUR_ID,
  AGENDA_OVERVIEW_TOUR_ID,
  getAgendaCreateTourSteps,
  getAgendaOverviewTourSteps,
} from "../definitions/agenda";
import {
  isModuleTourSeen,
  markModuleTourSeen,
} from "../prefs/module";
import { runSchedulyTour } from "../core/run-tour";
import { START_MODULE_TOUR_EVENT } from "./ModuleTutorialOrchestrator";

type AgendaTutorialContextValue = {
  running: boolean;
  startOverview: () => void;
  startCreate: () => void;
};

const AgendaTutorialContext =
  createContext<AgendaTutorialContextValue | null>(null);

type ProviderProps = {
  children: ReactNode;
  /** Abre el modal de nuevo turno (sin guardar). */
  openCreateForm: () => void;
  /** Limpia el formulario al terminar el tour de crear. */
  resetCreateForm?: () => void;
  /** Si false, el tour de crear avisa y no abre. */
  canOpenCreate: boolean;
  /** Notifica si hay un tour activo (para no cerrar el modal al pausar). */
  onRunningChange?: (running: boolean) => void;
};

export function AgendaTutorialProvider({
  children,
  openCreateForm,
  resetCreateForm,
  canOpenCreate,
  onRunningChange,
}: ProviderProps) {
  const [running, setRunning] = useState(false);
  const instanceRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);
  const resetCreateFormRef = useRef(resetCreateForm);
  resetCreateFormRef.current = resetCreateForm;
  const onRunningChangeRef = useRef(onRunningChange);
  onRunningChangeRef.current = onRunningChange;

  const setTourRunning = useCallback((next: boolean) => {
    setRunning(next);
    onRunningChangeRef.current?.(next);
  }, []);

  const stopTour = useCallback(() => {
    try {
      instanceRef.current?.destroy();
    } catch {
      /* ignore */
    }
    instanceRef.current = null;
    startedRef.current = false;
    setTourRunning(false);
  }, [setTourRunning]);

  const startOverview = useCallback(() => {
    if (startedRef.current && instanceRef.current?.isActive()) return;
    stopTour();
    startedRef.current = true;
    setTourRunning(true);
    window.setTimeout(() => {
      instanceRef.current = runSchedulyTour({
        steps: getAgendaOverviewTourSteps(),
        autoPlay: true,
        autoPlayMs: 2800,
        onDestroyed: () => {
          markModuleTourSeen(AGENDA_OVERVIEW_TOUR_ID);
          markModuleTourSeen("agenda");
          instanceRef.current = null;
          startedRef.current = false;
          setTourRunning(false);
        },
      });
      if (!instanceRef.current) {
        startedRef.current = false;
        setTourRunning(false);
      }
    }, 120);
  }, [stopTour, setTourRunning]);

  const startCreate = useCallback(() => {
    if (startedRef.current && instanceRef.current?.isActive()) return;
    if (!canOpenCreate) {
      openCreateForm();
      return;
    }
    stopTour();
    startedRef.current = true;
    setTourRunning(true);
    openCreateForm();
    window.setTimeout(() => {
      instanceRef.current = runSchedulyTour({
        steps: getAgendaCreateTourSteps(),
        autoPlay: true,
        autoPlayMs: 2400,
        showPointer: true,
        popoverOffset: 18,
        onDestroyed: () => {
          markModuleTourSeen(AGENDA_CREATE_TOUR_ID);
          resetCreateFormRef.current?.();
          instanceRef.current = null;
          startedRef.current = false;
          setTourRunning(false);
        },
      });
      if (!instanceRef.current) {
        startedRef.current = false;
        setTourRunning(false);
      }
    }, 700);
  }, [canOpenCreate, openCreateForm, stopTour, setTourRunning]);

  // Auto overview 1ª vez
  useEffect(() => {
    if (isModuleTourSeen(AGENDA_OVERVIEW_TOUR_ID) || isModuleTourSeen("agenda")) {
      return;
    }
    const t = window.setTimeout(() => startOverview(), 900);
    return () => window.clearTimeout(t);
  }, [startOverview]);

  // ? del header global
  useEffect(() => {
    const onStart = () => startOverview();
    window.addEventListener(START_MODULE_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_MODULE_TOUR_EVENT, onStart);
  }, [startOverview]);

  useEffect(() => () => stopTour(), [stopTour]);

  const value = useMemo(
    () => ({ running, startOverview, startCreate }),
    [running, startOverview, startCreate],
  );

  return (
    <AgendaTutorialContext.Provider value={value}>
      {children}
    </AgendaTutorialContext.Provider>
  );
}

function useAgendaTutorial() {
  const ctx = useContext(AgendaTutorialContext);
  if (!ctx) {
    throw new Error("AgendaTourHelp debe usarse dentro de AgendaTutorialProvider");
  }
  return ctx;
}

const helpBtnClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-separator bg-surface text-muted shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent disabled:opacity-50";

/** ? — explica leyenda, calendario y zonas de la agenda. */
export function AgendaOverviewHelpButton() {
  const { running, startOverview } = useAgendaTutorial();
  return (
    <button
      type="button"
      data-tour="agenda-help"
      onClick={startOverview}
      disabled={running}
      className={helpBtnClass}
      title="Tutorial: qué se ve en Agenda"
      aria-label="Tutorial: qué se ve en Agenda"
    >
      <CircleQuestion width={18} height={18} />
    </button>
  );
}

/** ? dentro del modal — mismo tour de agendar. */
export function AgendaCreateHelpButton({ inForm = false }: { inForm?: boolean }) {
  const { running, startCreate } = useAgendaTutorial();
  return (
    <button
      type="button"
      data-tour={inForm ? "agenda-form-help" : "agenda-create-help"}
      onClick={startCreate}
      disabled={running}
      className={helpBtnClass}
      title="Tutorial: cómo agendar un turno"
      aria-label="Tutorial: cómo agendar un turno"
    >
      <CircleQuestion width={18} height={18} />
    </button>
  );
}

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
  BRANCHES_FORM_TOUR_ID,
  BRANCHES_OVERVIEW_TOUR_ID,
  BRANCHES_TEAM_TOUR_ID,
  getBranchesFormTourSteps,
  getBranchesOverviewTourSteps,
  getBranchesTeamTourSteps,
} from "../definitions/branches";
import {
  isModuleTourSeen,
  markModuleTourSeen,
} from "../prefs/module";
import { runSchedulyTour } from "../core/run-tour";
import { requestTourCloseOverlays } from "../core/overlays";
import { START_MODULE_TOUR_EVENT } from "./ModuleTutorialOrchestrator";

type BranchesTutorialContextValue = {
  running: boolean;
  startOverview: () => void;
  startForm: () => void;
  startTeam: () => void;
};

const BranchesTutorialContext =
  createContext<BranchesTutorialContextValue | null>(null);

type ProviderProps = {
  children: ReactNode;
  /** Abre Gestionar equipo del primer local (o el indicado). */
  openTeamModal: () => void;
  /** Cierra el modal al terminar el tour de equipo. */
  closeTeamModal?: () => void;
  /** Carga datos de prueba en el modal (antes del tour). */
  prepareTeamTour?: () => void;
  /** Restaura datos reales al terminar el tour. */
  cleanupTeamTour?: () => void;
  /** Empieza overview como sin locales (simulación). */
  prepareOverviewTour?: () => void;
  /** Restaura pantalla real al terminar overview. */
  cleanupOverviewTour?: () => void;
  /** Abre modal Nuevo local (tour de campos). */
  openCreateForm?: () => void;
  /** Cierra/limpia el form de Nuevo local al terminar tour de campos. */
  resetCreateFormTour?: () => void;
  canManageTeam: boolean;
  /** Si false, no auto-lanza ni muestra ayuda de dueña. */
  enabled?: boolean;
  onRunningChange?: (running: boolean) => void;
};

export function BranchesTutorialProvider({
  children,
  openTeamModal,
  closeTeamModal,
  prepareTeamTour,
  cleanupTeamTour,
  prepareOverviewTour,
  cleanupOverviewTour,
  openCreateForm,
  resetCreateFormTour,
  canManageTeam,
  enabled = true,
  onRunningChange,
}: ProviderProps) {
  const [running, setRunning] = useState(false);
  const instanceRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);
  const closeTeamModalRef = useRef(closeTeamModal);
  closeTeamModalRef.current = closeTeamModal;
  const prepareTeamTourRef = useRef(prepareTeamTour);
  prepareTeamTourRef.current = prepareTeamTour;
  const cleanupTeamTourRef = useRef(cleanupTeamTour);
  cleanupTeamTourRef.current = cleanupTeamTour;
  const prepareOverviewTourRef = useRef(prepareOverviewTour);
  prepareOverviewTourRef.current = prepareOverviewTour;
  const cleanupOverviewTourRef = useRef(cleanupOverviewTour);
  cleanupOverviewTourRef.current = cleanupOverviewTour;
  const openCreateFormRef = useRef(openCreateForm);
  openCreateFormRef.current = openCreateForm;
  const resetCreateFormTourRef = useRef(resetCreateFormTour);
  resetCreateFormTourRef.current = resetCreateFormTour;
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
    if (!enabled) return;
    if (startedRef.current && instanceRef.current?.isActive()) return;
    stopTour();
    startedRef.current = true;
    setTourRunning(true);
    prepareOverviewTourRef.current?.();
    window.setTimeout(() => {
      instanceRef.current = runSchedulyTour({
        steps: getBranchesOverviewTourSteps(),
        autoPlay: true,
        autoPlayMs: 2600,
        showPointer: true,
        popoverOffset: 14,
        onDestroyed: () => {
          markModuleTourSeen(BRANCHES_OVERVIEW_TOUR_ID);
          markModuleTourSeen("branches");
          cleanupOverviewTourRef.current?.();
          instanceRef.current = null;
          startedRef.current = false;
          setTourRunning(false);
        },
      });
      if (!instanceRef.current) {
        cleanupOverviewTourRef.current?.();
        startedRef.current = false;
        setTourRunning(false);
      }
    }, 280);
  }, [enabled, stopTour, setTourRunning]);

  const startForm = useCallback(() => {
    if (!enabled) return;
    if (startedRef.current && instanceRef.current?.isActive()) return;
    stopTour();
    startedRef.current = true;
    setTourRunning(true);
    openCreateFormRef.current?.();
    window.setTimeout(() => {
      instanceRef.current = runSchedulyTour({
        steps: getBranchesFormTourSteps(),
        autoPlay: true,
        autoPlayMs: 2400,
        showPointer: true,
        popoverOffset: 14,
        onDestroyed: () => {
          markModuleTourSeen(BRANCHES_FORM_TOUR_ID);
          resetCreateFormTourRef.current?.();
          instanceRef.current = null;
          startedRef.current = false;
          setTourRunning(false);
        },
      });
      if (!instanceRef.current) {
        resetCreateFormTourRef.current?.();
        startedRef.current = false;
        setTourRunning(false);
      }
    }, 450);
  }, [enabled, stopTour, setTourRunning]);

  const startTeam = useCallback(() => {
    if (!enabled) return;
    if (startedRef.current && instanceRef.current?.isActive()) return;
    if (!canManageTeam) {
      openTeamModal();
      return;
    }
    stopTour();
    startedRef.current = true;
    setTourRunning(true);
    openTeamModal();
    window.setTimeout(() => {
      prepareTeamTourRef.current?.();
    }, 420);
    window.setTimeout(() => {
      instanceRef.current = runSchedulyTour({
        steps: getBranchesTeamTourSteps(),
        autoPlay: true,
        autoPlayMs: 2400,
        showPointer: true,
        popoverOffset: 16,
        onDestroyed: () => {
          markModuleTourSeen(BRANCHES_TEAM_TOUR_ID);
          requestTourCloseOverlays();
          cleanupTeamTourRef.current?.();
          closeTeamModalRef.current?.();
          instanceRef.current = null;
          startedRef.current = false;
          setTourRunning(false);
        },
      });
      if (!instanceRef.current) {
        cleanupTeamTourRef.current?.();
        startedRef.current = false;
        setTourRunning(false);
        closeTeamModalRef.current?.();
      }
    }, 900);
  }, [enabled, canManageTeam, openTeamModal, stopTour, setTourRunning]);

  useEffect(() => {
    if (!enabled) return;
    if (
      isModuleTourSeen(BRANCHES_OVERVIEW_TOUR_ID) ||
      isModuleTourSeen("branches")
    ) {
      return;
    }
    const t = window.setTimeout(() => startOverview(), 900);
    return () => window.clearTimeout(t);
  }, [enabled, startOverview]);

  useEffect(() => {
    if (!enabled) return;
    const onStart = () => startOverview();
    window.addEventListener(START_MODULE_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_MODULE_TOUR_EVENT, onStart);
  }, [enabled, startOverview]);

  useEffect(() => () => stopTour(), [stopTour]);

  const value = useMemo(
    () => ({ running, startOverview, startForm, startTeam }),
    [running, startOverview, startForm, startTeam],
  );

  return (
    <BranchesTutorialContext.Provider value={value}>
      {children}
    </BranchesTutorialContext.Provider>
  );
}

function useBranchesTutorial() {
  const ctx = useContext(BranchesTutorialContext);
  if (!ctx) {
    throw new Error(
      "BranchesTourHelp debe usarse dentro de BranchesTutorialProvider",
    );
  }
  return ctx;
}

const helpBtnClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-separator bg-surface text-muted shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent disabled:opacity-50";

const helpBtnClassModal =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-separator bg-surface text-muted shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent disabled:opacity-50";

/** ? de página — overview vacío → lista. */
export function BranchesOverviewHelpButton() {
  const { running, startOverview } = useBranchesTutorial();
  return (
    <button
      type="button"
      data-tour="branches-help"
      onClick={startOverview}
      disabled={running}
      className={helpBtnClass}
      title="Tutorial: Sucursales"
      aria-label="Tutorial: Sucursales"
    >
      <CircleQuestion width={18} height={18} />
    </button>
  );
}

/** ? dentro del modal Nuevo local — solo campos. */
export function BranchesFormHelpButton() {
  const { running, startForm } = useBranchesTutorial();
  return (
    <button
      type="button"
      data-tour="branches-form-help"
      onClick={startForm}
      disabled={running}
      className={helpBtnClassModal}
      title="Tutorial: campos del local"
      aria-label="Tutorial: campos del local"
    >
      <CircleQuestion width={16} height={16} />
    </button>
  );
}

export function BranchesTeamHelpButton({ inModal = false }: { inModal?: boolean }) {
  const { running, startTeam } = useBranchesTutorial();
  return (
    <button
      type="button"
      data-tour={inModal ? "branches-team-help" : "branches-team-tour"}
      onClick={startTeam}
      disabled={running}
      className={helpBtnClass}
      title="Tutorial: gestionar equipo"
      aria-label="Tutorial: gestionar equipo"
    >
      <CircleQuestion width={18} height={18} />
    </button>
  );
}

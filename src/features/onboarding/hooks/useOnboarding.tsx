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
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  findModuleTour,
  moduleTours,
  moduleTourStorageKey,
  onboardingSteps,
  onboardingStorageKey,
  type ModuleTour,
  type OnboardingStep,
} from "../lib/steps";
import { getShellTourSteps } from "../lib/shell-tour";

type Phase =
  | "loading"
  | "welcome"
  | "tour"
  | "module-prompt"
  | "module-tour"
  | "idle";

type OnboardingContextValue = {
  phase: Phase;
  stepIndex: number;
  step: OnboardingStep | null;
  totalSteps: number;
  activeModule: ModuleTour | null;
  startTour: () => void;
  startModuleTour: (moduleId?: string) => void;
  skip: () => void;
  next: () => void;
  prev: () => void;
  complete: () => void;
  dismissModulePrompt: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "done";
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, "done");
  } catch {
    // ignore
  }
}

function clearFlag(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function resolveModule(moduleId: string | undefined, pathname: string) {
  if (moduleId) {
    return moduleTours.find((t) => t.id === moduleId) ?? null;
  }
  return findModuleTour(pathname);
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("loading");
  const [stepIndex, setStepIndex] = useState(0);
  const [tourSteps, setTourSteps] = useState<OnboardingStep[]>(onboardingSteps);
  const [activeModule, setActiveModule] = useState<ModuleTour | null>(null);
  const [promptModule, setPromptModule] = useState<ModuleTour | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (!user) {
      setPhase("loading");
      return;
    }
    const done = readFlag(onboardingStorageKey(user.id));
    setPhase(done ? "idle" : "welcome");
    setStepIndex(0);
  }, [user]);

  // Los tours por pantalla los maneja ModuleTutorialOrchestrator (driver.js).
  // Aquí solo queda el welcome + mapa del shell en Inicio.
  useEffect(() => {
    if (!user) return;
    const current = phaseRef.current;
    if (current === "module-prompt") {
      setPromptModule(null);
      setPhase("idle");
    }
  }, [pathname, user]);

  const goToGlobalStep = useCallback(
    (index: number, steps?: OnboardingStep[]) => {
      const list = steps ?? tourSteps;
      const step = list[index];
      if (!step) return;
      setStepIndex(index);
      if (step.expandModule) {
        window.dispatchEvent(
          new CustomEvent("scheduly:onboarding-expand", {
            detail: { moduleId: step.expandModule },
          }),
        );
      }
      // Orientación del shell: nos quedamos en Inicio.
      if (step.href === appRoutes.inicio && pathname !== appRoutes.inicio) {
        router.push(appRoutes.inicio);
      }
    },
    [pathname, router, tourSteps],
  );

  const startTour = useCallback(() => {
    if (!user) return;
    clearFlag(onboardingStorageKey(user.id));
    setActiveModule(null);
    setPromptModule(null);
    const steps = getShellTourSteps(user.role);
    const resolved = steps.length ? steps : onboardingSteps;
    setTourSteps(resolved);
    setStepIndex(0);
    setPhase("tour");
    // Solo asegura el menú expandido (ancho); el puntero abre cada bloque.
    window.dispatchEvent(new CustomEvent("scheduly:onboarding-expand"));
    if (pathname !== appRoutes.inicio) {
      router.push(appRoutes.inicio);
      window.setTimeout(() => goToGlobalStep(0, resolved), 350);
    } else {
      goToGlobalStep(0, resolved);
    }
  }, [user, goToGlobalStep, pathname, router]);

  const startModuleTour = useCallback(
    (moduleId?: string) => {
      const resolved = resolveModule(moduleId, pathname);
      setPromptModule(null);
      setActiveModule(null);
      if (phaseRef.current === "module-prompt" || phaseRef.current === "module-tour") {
        setPhase("idle");
      }
      // driver.js global (ModuleTutorialOrchestrator)
      window.dispatchEvent(
        new CustomEvent("scheduly:start-module-tour", {
          detail: { moduleId: resolved?.id },
        }),
      );
      if (!resolved) return;
      const targetHref = resolved.match[0];
      if (!targetHref) return;
      if (
        targetHref === appRoutes.dashboard ||
        targetHref === appRoutes.inicio ||
        targetHref === "/"
      ) {
        if (pathname !== targetHref && targetHref !== "/") {
          router.push(targetHref === "/" ? appRoutes.inicio : targetHref);
        } else if (targetHref === "/" && pathname !== appRoutes.inicio) {
          router.push(appRoutes.inicio);
        }
        return;
      }
      if (pathname !== targetHref && !pathname.startsWith(`${targetHref}/`)) {
        router.push(targetHref);
      }
    },
    [pathname, router],
  );

  const complete = useCallback(() => {
    if (user) {
      if (phase === "tour" || phase === "welcome") {
        writeFlag(onboardingStorageKey(user.id));
      }
      if (phase === "module-tour" && activeModule) {
        writeFlag(moduleTourStorageKey(user.id, activeModule.id));
      }
    }
    setPhase("idle");
    setStepIndex(0);
    setActiveModule(null);
    setPromptModule(null);
  }, [user, phase, activeModule]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  const dismissModulePrompt = useCallback(() => {
    if (user && promptModule) {
      writeFlag(moduleTourStorageKey(user.id, promptModule.id));
    }
    setPromptModule(null);
    setPhase("idle");
  }, [user, promptModule]);

  const next = useCallback(() => {
    if (stepIndex >= tourSteps.length - 1) {
      complete();
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    if (phase === "tour") goToGlobalStep(nextIndex);
  }, [stepIndex, tourSteps.length, complete, phase, goToGlobalStep]);

  const prev = useCallback(() => {
    if (stepIndex <= 0) {
      if (phase === "tour") setPhase("welcome");
      else {
        setPhase("idle");
        setActiveModule(null);
      }
      return;
    }
    const prevIndex = stepIndex - 1;
    setStepIndex(prevIndex);
    if (phase === "tour") goToGlobalStep(prevIndex);
  }, [stepIndex, phase, goToGlobalStep]);

  const currentStep =
    phase === "tour" || phase === "module-tour"
      ? (tourSteps[stepIndex] ?? null)
      : null;

  const value = useMemo<OnboardingContextValue>(
    () => ({
      phase,
      stepIndex,
      step: currentStep,
      totalSteps: tourSteps.length,
      activeModule:
        phase === "module-prompt"
          ? promptModule
          : phase === "module-tour"
            ? activeModule
            : findModuleTour(pathname),
      startTour,
      startModuleTour,
      skip,
      next,
      prev,
      complete,
      dismissModulePrompt,
    }),
    [
      phase,
      stepIndex,
      currentStep,
      tourSteps.length,
      promptModule,
      activeModule,
      pathname,
      startTour,
      startModuleTour,
      skip,
      next,
      prev,
      complete,
      dismissModulePrompt,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}

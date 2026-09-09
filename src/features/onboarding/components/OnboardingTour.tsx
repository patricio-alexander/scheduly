"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import Rocket from "@gravity-ui/icons/Rocket";
import ArrowChevronLeft from "@gravity-ui/icons/ArrowChevronLeft";
import ArrowChevronRight from "@gravity-ui/icons/ArrowChevronRight";
import { useOnboarding } from "../hooks/useOnboarding";

type Rect = { top: number; left: number; width: number; height: number };
type Point = { x: number; y: number };

const DEFAULT_DWELL_MS = 2600;
const POINTER_MOVE_MS = 650;

function measureTarget(target?: string, scroll = false): Rect | null {
  if (!target || typeof document === "undefined") return null;
  const el = document.querySelector(`[data-onboarding="${target}"]`);
  if (!el) return null;
  if (scroll) {
    el.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  };
}

function clickOnboardingTarget(target?: string) {
  if (!target) return;
  const wrap = document.querySelector(`[data-onboarding="${target}"]`);
  if (!(wrap instanceof HTMLElement)) return;
  const btn =
    wrap.matches("button") || wrap.getAttribute("role") === "button"
      ? wrap
      : wrap.querySelector("button");
  if (btn instanceof HTMLElement) btn.click();
  else wrap.click();
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/** Puntero tipo cursor para simular interacción en el tour. */
function TourPointer({
  point,
  pressing,
  visible,
}: {
  point: Point;
  pressing: boolean;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none fixed z-[90] transition-transform duration-500 ease-out"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${point.x}px, ${point.y}px) scale(${pressing ? 0.88 : 1})`,
      }}
      aria-hidden
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
      >
        <path
          d="M5.5 3.5L5.5 18.5L9.2 14.9L12.1 21.2L14.4 20.1L11.5 13.9L16.5 13.9L5.5 3.5Z"
          fill="#F5E6A3"
          stroke="#0A0804"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      {pressing ? (
        <span className="absolute left-1 top-1 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40 animate-ping" />
      ) : null}
    </div>
  );
}

export function OnboardingTour() {
  const { phase, step, stepIndex, totalSteps, next, prev, skip, activeModule } =
    useOnboarding();
  const [rect, setRect] = useState<Rect | null>(null);
  const [paused, setPaused] = useState(false);
  const [pointer, setPointer] = useState<Point>({ x: 400, y: 280 });
  const [pointerVisible, setPointerVisible] = useState(false);
  const [pressing, setPressing] = useState(false);
  const pointerRef = useRef(pointer);
  pointerRef.current = pointer;
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const stepAbortRef = useRef<AbortController | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  const clearAdvance = () => {
    if (advanceTimerRef.current != null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  const abortStep = () => {
    stepAbortRef.current?.abort();
    stepAbortRef.current = null;
  };

  useLayoutEffect(() => {
    if ((phase !== "tour" && phase !== "module-tour") || !step) {
      setRect(null);
      setPointerVisible(false);
      clearAdvance();
      abortStep();
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const update = (withScroll: boolean) => {
      if (cancelled) return;
      const nextRect = measureTarget(step.target, withScroll);
      setRect(nextRect);
      if (!nextRect && attempts < 16) {
        attempts += 1;
        window.setTimeout(() => update(attempts === 1), 100);
      }
    };

    update(true);
    const onResize = () => update(false);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [phase, step, stepIndex]);

  // Simulación de puntero + auto-avance (como el tutorial de login)
  useEffect(() => {
    if ((phase !== "tour" && phase !== "module-tour") || !step) return;

    clearAdvance();
    abortStep();
    const ac = new AbortController();
    stepAbortRef.current = ac;
    setPressing(false);
    setPointerVisible(true);

    const run = async () => {
      try {
        // Espera a que el target exista
        let targetRect: Rect | null = null;
        for (let i = 0; i < 20; i++) {
          if (ac.signal.aborted) return;
          targetRect = measureTarget(step.target, i === 0);
          if (targetRect) break;
          await sleep(80, ac.signal);
        }
        if (!targetRect || ac.signal.aborted) return;

        const dest = {
          x: targetRect.left + Math.min(targetRect.width * 0.55, 48),
          y: targetRect.top + Math.min(targetRect.height * 0.55, 28),
        };

        setPointer(dest);
        await sleep(POINTER_MOVE_MS, ac.signal);

        if (step.pointerClick) {
          setPressing(true);
          await sleep(180, ac.signal);
          clickOnboardingTarget(step.target);
          await sleep(220, ac.signal);
          setPressing(false);
          // Remedir tras abrir acordeón
          await sleep(280, ac.signal);
          const after = measureTarget(step.target, true);
          if (after) setRect(after);
        }

        if (pausedRef.current || ac.signal.aborted) return;

        const dwell = step.dwellMs ?? DEFAULT_DWELL_MS;
        advanceTimerRef.current = window.setTimeout(() => {
          advanceTimerRef.current = null;
          if (!pausedRef.current) next();
        }, dwell);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          /* ignore */
        }
      }
    };

    void run();
    return () => {
      clearAdvance();
      abortStep();
    };
    // paused se maneja aparte al reanudar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step, stepIndex, next]);

  useEffect(() => {
    if (!paused) return;
    clearAdvance();
  }, [paused]);

  useEffect(() => {
    if (phase !== "tour" && phase !== "module-tour") {
      setPaused(false);
      setPointerVisible(false);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [phase]);

  if ((phase !== "tour" && phase !== "module-tour") || !step) return null;

  const pad = 8;
  const highlight = rect
    ? {
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const tooltipStyle = (() => {
    if (!highlight) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      } as const;
    }
    const spaceRight = window.innerWidth - (highlight.left + highlight.width);
    const placeRight = spaceRight > 360;
    if (placeRight) {
      return {
        top: Math.min(highlight.top, window.innerHeight - 300),
        left: highlight.left + highlight.width + 16,
      } as const;
    }
    const placeBelow =
      highlight.top + highlight.height + 300 < window.innerHeight;
    if (placeBelow) {
      return {
        top: highlight.top + highlight.height + 16,
        left: Math.min(
          Math.max(16, highlight.left),
          window.innerWidth - 360,
        ),
      } as const;
    }
    return {
      top: Math.max(16, highlight.top - 240),
      left: Math.min(
        Math.max(16, highlight.left),
        window.innerWidth - 360,
      ),
    } as const;
  })();

  const isLast = stepIndex >= totalSteps - 1;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      {highlight ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-accent/80 transition-all duration-200"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      <TourPointer point={pointer} pressing={pressing} visible={pointerVisible} />

      <div
        className="absolute z-[81] w-[min(100vw-2rem,22rem)] rounded-2xl border border-separator bg-surface p-4 shadow-2xl"
        style={tooltipStyle}
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="shrink-0 rounded-xl bg-accent/10 p-2 text-accent">
            <Rocket width={18} height={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              {phase === "module-tour" && activeModule
                ? `${activeModule.label} · ${stepIndex + 1}/${totalSteps}`
                : `Paso ${stepIndex + 1} de ${totalSteps}`}
              {paused ? " · Pausado" : " · Automático"}
            </p>
            <h2 className="mt-0.5 text-base font-bold tracking-tight">
              {step.title}
            </h2>
          </div>
        </div>

        <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
          {step.description}
        </p>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{
              width: `${((stepIndex + 1) / totalSteps) * 100}%`,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onPress={skip}>
            Saltar
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                setPaused((p) => {
                  const nextPaused = !p;
                  if (!nextPaused) {
                    // Reanuda: avanza pronto
                    clearAdvance();
                    advanceTimerRef.current = window.setTimeout(() => {
                      advanceTimerRef.current = null;
                      next();
                    }, 900);
                  } else {
                    clearAdvance();
                  }
                  return nextPaused;
                });
              }}
            >
              {paused ? "Reanudar" : "Pausa"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isDisabled={stepIndex === 0}
              onPress={() => {
                clearAdvance();
                abortStep();
                prev();
              }}
            >
              <ArrowChevronLeft width={14} height={14} />
              Atrás
            </Button>
            <Button
              size="sm"
              variant="primary"
              onPress={() => {
                clearAdvance();
                abortStep();
                next();
              }}
            >
              {isLast ? "Listo" : "Siguiente"}
              {!isLast && <ArrowChevronRight width={14} height={14} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

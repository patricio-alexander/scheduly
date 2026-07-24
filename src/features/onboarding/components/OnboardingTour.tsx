"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@heroui/react";
import Rocket from "@gravity-ui/icons/Rocket";
import ArrowChevronLeft from "@gravity-ui/icons/ArrowChevronLeft";
import ArrowChevronRight from "@gravity-ui/icons/ArrowChevronRight";
import { useOnboarding } from "../hooks/useOnboarding";

type Rect = { top: number; left: number; width: number; height: number };

function measureTarget(target?: string, scroll = false): Rect | null {
  if (!target || typeof document === "undefined") return null;
  const el = document.querySelector(`[data-onboarding="${target}"]`);
  if (!el) return null;
  if (scroll) {
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
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

export function OnboardingTour() {
  const { phase, step, stepIndex, totalSteps, next, prev, skip, activeModule } =
    useOnboarding();
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    if ((phase !== "tour" && phase !== "module-tour") || !step) {
      setRect(null);
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

  useEffect(() => {
    if (phase !== "tour" && phase !== "module-tour") return;
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
        top: Math.min(highlight.top, window.innerHeight - 280),
        left: highlight.left + highlight.width + 16,
      } as const;
    }
    const placeBelow = highlight.top + highlight.height + 300 < window.innerHeight;
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
      top: Math.max(16, highlight.top - 220),
      left: Math.min(
        Math.max(16, highlight.left),
        window.innerWidth - 360,
      ),
    } as const;
  })();

  const isLast = stepIndex >= totalSteps - 1;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      {/* Backdrop with spotlight hole via box-shadow */}
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
            </p>
            <h2 className="mt-0.5 text-base font-bold tracking-tight">
              {step.title}
            </h2>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted">{step.description}</p>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{
              width: `${((stepIndex + 1) / totalSteps) * 100}%`,
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onPress={skip}>
            Saltar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              isDisabled={stepIndex === 0}
              onPress={prev}
            >
              <ArrowChevronLeft width={14} height={14} />
              Atrás
            </Button>
            <Button size="sm" variant="primary" onPress={next}>
              {isLast ? "Finalizar" : "Siguiente"}
              {!isLast && <ArrowChevronRight width={14} height={14} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

const RIPPLE_SELECTOR = ".button, .md-btn, .cash-day-chip";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MdMotionRoot() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (prefersReducedMotion()) return;
      const el = (event.target as Element | null)?.closest(RIPPLE_SELECTOR);
      if (!(el instanceof HTMLElement)) return;
      if (el.matches(":disabled, [aria-disabled='true']")) return;

      const rect = el.getBoundingClientRect();
      el.style.setProperty("--md-ripple-x", `${event.clientX - rect.left}px`);
      el.style.setProperty("--md-ripple-y", `${event.clientY - rect.top}px`);
      el.classList.remove("is-rippling");
      void el.offsetWidth;
      el.classList.add("is-rippling");
    };

    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== "md-btn-ripple") return;
      const el = event.target;
      if (el instanceof HTMLElement) el.classList.remove("is-rippling");
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("animationend", onAnimationEnd);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("animationend", onAnimationEnd);
    };
  }, []);

  return null;
}

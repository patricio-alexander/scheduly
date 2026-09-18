import { useEffect, useState } from "react";

function easeEmphasizedDecelerate(t: number) {
  return 1 - (1 - t) ** 3;
}

export function useAnimatedNumber(target: number, enabled = true) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCurrent(target);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(target);
      return;
    }

    setCurrent(0);
    const duration = 1600;
    let frame = 0;
    let startedAt = 0;

    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / duration);
      setCurrent(target * easeEmphasizedDecelerate(progress));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, target]);

  return current;
}

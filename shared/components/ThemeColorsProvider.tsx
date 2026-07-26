"use client";

import { useEffect } from "react";
import { apiUrl } from "@/shared/utils/api";
import {
  THEME_COLORS_UPDATED_EVENT,
  applyThemeColors,
  normalizeThemeColors,
  readStoredThemeColors,
  storeThemeColors,
  type ThemeColors,
} from "@/shared/utils/business-profile";

export function ThemeColorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const stored = readStoredThemeColors();
    if (stored) applyThemeColors(stored);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/settings"), { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (cancelled || !res.ok || !json) return;
        const colors = normalizeThemeColors(json as Partial<ThemeColors>);
        applyThemeColors(colors);
        storeThemeColors(colors);
      } catch {
        // keep stored / defaults
      }
    })();

    const onUpdated = (event: Event) => {
      const custom = event as CustomEvent<ThemeColors>;
      if (!custom.detail) return;
      const colors = normalizeThemeColors(custom.detail);
      applyThemeColors(colors);
      storeThemeColors(colors);
    };

    window.addEventListener(THEME_COLORS_UPDATED_EVENT, onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(THEME_COLORS_UPDATED_EVENT, onUpdated);
    };
  }, []);

  return children;
}

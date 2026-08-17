"use client";

import { useEffect } from "react";
import { apiUrl } from "@/shared/utils/api";
import {
  THEME_COLORS_SOCKET_EVENT,
  THEME_COLORS_UPDATED_EVENT,
  commitThemeColors,
  normalizeThemeColors,
  readStoredThemeColors,
  type ThemeColors,
} from "@/shared/utils/business-profile";
import { getClientSocket } from "@/shared/utils/socket-client";

export function ThemeColorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const stored = readStoredThemeColors();
    if (stored) commitThemeColors(stored);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/settings"), { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (cancelled || !res.ok || !json) return;
        commitThemeColors(normalizeThemeColors(json as Partial<ThemeColors>));
      } catch {
        // keep stored / defaults
      }
    })();

    const onUpdated = (event: Event) => {
      const custom = event as CustomEvent<ThemeColors>;
      if (!custom.detail) return;
      commitThemeColors(custom.detail);
    };

    window.addEventListener(THEME_COLORS_UPDATED_EVENT, onUpdated);

    const socket = getClientSocket();
    const onRemoteUpdate = (payload: Partial<ThemeColors>) => {
      commitThemeColors(normalizeThemeColors(payload));
    };
    socket.on(THEME_COLORS_SOCKET_EVENT, onRemoteUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(THEME_COLORS_UPDATED_EVENT, onUpdated);
      socket.off(THEME_COLORS_SOCKET_EVENT, onRemoteUpdate);
    };
  }, []);

  return children;
}

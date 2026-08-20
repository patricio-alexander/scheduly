"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import {
  chartSafePalette,
  type ChartThemeColors,
} from "@/shared/utils/chart-colors";

/** Colores #rrggbb fijos para charts (evita lab/oklch/var de Chromium/CSS). */
export function useChartThemeColors(): ChartThemeColors {
  const { resolvedTheme } = useTheme();
  return useMemo(
    () => chartSafePalette(resolvedTheme === "dark"),
    [resolvedTheme],
  );
}

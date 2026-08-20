/** Colores hex fijos (lightweight-charts solo entiende hex/rgb/hsl clásicos). */
export const CHART_FALLBACK = {
  muted: "#8a8580",
  mutedDark: "#a8a29a",
  separator: "#d9d4cc",
  separatorDark: "#2a2620",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f0b429",
  accent: "#f5c518",
  foreground: "#1a1408",
  foregroundDark: "#f7f2e8",
  surface: "#ffffff",
  surfaceDark: "#0c0a08",
} as const;

function toHexByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

/** Parsea rgb()/rgba() → #rrggbb */
function rgbStringToHex(color: string): string | null {
  const m = color.match(
    /rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i,
  );
  if (!m) return null;
  return `#${toHexByte(Number(m[1]))}${toHexByte(Number(m[2]))}${toHexByte(Number(m[3]))}`;
}

/**
 * Convierte cualquier color CSS a #rrggbb leyendo un pixel en canvas sRGB.
 * Evita lab()/oklch()/var() que rompen lightweight-charts.
 */
export function cssColorToHex(
  cssColor: string,
  fallback: string = CHART_FALLBACK.muted,
): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }

  const trimmed = cssColor.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return trimmed.slice(0, 7).toLowerCase();
  }

  const fromRgb = rgbStringToHex(trimmed);
  if (fromRgb) return fromRgb;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000000";
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return fallback;
    return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  } catch {
    return fallback;
  }
}

/** @deprecated Usar cssColorToHex — lightweight-charts no parsea lab()/oklch. */
export function cssColorToRgb(cssColor: string, fallback?: string) {
  return cssColorToHex(cssColor, fallback);
}

export function cssVarToHex(varName: string, fallback: string): string {
  const name = varName.startsWith("--") ? varName : `--${varName}`;
  return cssColorToHex(`var(${name})`, fallback);
}

/** @deprecated Usar cssVarToHex */
export function cssVarToRgb(varName: string, fallback: string) {
  return cssVarToHex(varName, fallback);
}

export type ChartThemeColors = {
  muted: string;
  separator: string;
  success: string;
  danger: string;
  warning: string;
  accent: string;
  foreground: string;
  surface: string;
  isDark: boolean;
};

export function readChartThemeColors(): ChartThemeColors {
  const isDark =
    typeof document !== "undefined" &&
    (document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark");

  return {
    muted: cssVarToHex(
      "muted",
      isDark ? CHART_FALLBACK.mutedDark : CHART_FALLBACK.muted,
    ),
    separator: cssVarToHex(
      "separator",
      isDark ? CHART_FALLBACK.separatorDark : CHART_FALLBACK.separator,
    ),
    success: cssVarToHex("success", CHART_FALLBACK.success),
    danger: cssVarToHex("danger", CHART_FALLBACK.danger),
    warning: cssVarToHex("warning", CHART_FALLBACK.warning),
    accent: cssVarToHex("accent", CHART_FALLBACK.accent),
    foreground: cssVarToHex(
      "foreground",
      isDark ? CHART_FALLBACK.foregroundDark : CHART_FALLBACK.foreground,
    ),
    surface: cssVarToHex(
      "surface",
      isDark ? CHART_FALLBACK.surfaceDark : CHART_FALLBACK.surface,
    ),
    isDark: Boolean(isDark),
  };
}

/** Paleta solo hex para lightweight-charts (sin depender del motor CSS). */
export function chartSafePalette(isDark: boolean): ChartThemeColors {
  return {
    muted: isDark ? CHART_FALLBACK.mutedDark : CHART_FALLBACK.muted,
    separator: isDark ? CHART_FALLBACK.separatorDark : CHART_FALLBACK.separator,
    success: CHART_FALLBACK.success,
    danger: CHART_FALLBACK.danger,
    warning: CHART_FALLBACK.warning,
    accent: CHART_FALLBACK.accent,
    foreground: isDark
      ? CHART_FALLBACK.foregroundDark
      : CHART_FALLBACK.foreground,
    surface: isDark ? CHART_FALLBACK.surfaceDark : CHART_FALLBACK.surface,
    isDark,
  };
}

export type ChartRgba = [number, number, number, number];

/**
 * Parser para `layout.colorParsers` de lightweight-charts.
 * Chromium moderno serializa colores como lab()/oklch(); LWC solo acepta rgb()
 * nativo, así que resolvemos a RGBA vía canvas / hex / rgb.
 */
export function lightweightChartsColorParser(color: string): ChartRgba | null {
  if (!color || typeof color !== "string") return null;
  const trimmed = color.trim();
  if (!trimmed || trimmed === "transparent") return null;

  const hexMatch = trimmed.match(
    /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
  );
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+)\s*[,/ ]\s*([\d.]+)\s*[,/ ]\s*([\d.]+)(?:\s*[,/ ]\s*([\d.]+%?))?\s*\)$/i,
  );
  if (rgbMatch) {
    const aRaw = rgbMatch[4];
    let a = 1;
    if (aRaw != null) {
      a = aRaw.endsWith("%") ? parseFloat(aRaw) / 100 : parseFloat(aRaw);
    }
    return [
      Math.round(Number(rgbMatch[1])),
      Math.round(Number(rgbMatch[2])),
      Math.round(Number(rgbMatch[3])),
      a,
    ];
  }

  if (typeof document === "undefined") return null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = trimmed;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  } catch {
    return null;
  }
}

export type ThemeColors = {
  accentColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
};

export type BusinessProfile = {
  businessName: string;
  address: string;
  logoPath: string | null;
  ruc: string;
  tradeName: string;
  obligationAccounting: boolean;
} & ThemeColors;

export const DEFAULT_BUSINESS_NAME = "Scheduly";

export const DEFAULT_THEME_COLORS: ThemeColors = {
  accentColor: "#7DFF7A",
  successColor: "#5FD46A",
  warningColor: "#F0B429",
  dangerColor: "#F04438",
};

export const THEME_COLOR_STORAGE_KEY = "scheduly.theme-colors";

export const ACCENT_PRESETS = [
  { label: "Verde", value: "#7DFF7A" },
  { label: "Lima", value: "#C8F542" },
  { label: "Azul", value: "#5B8CFF" },
  { label: "Cian", value: "#2DD4BF" },
  { label: "Naranja", value: "#FF8A3D" },
  { label: "Rosa", value: "#FF6B9D" },
  { label: "Violeta", value: "#A78BFA" },
  { label: "Gris", value: "#94A3B8" },
] as const;

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function normalizeHex(value: unknown, fallback: string): string {
  const raw = String(value ?? "").trim();
  if (HEX_RE.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return fallback.toUpperCase();
}

export function normalizeThemeColors(
  input?: Partial<ThemeColors> | null,
): ThemeColors {
  return {
    accentColor: normalizeHex(
      input?.accentColor,
      DEFAULT_THEME_COLORS.accentColor,
    ),
    successColor: normalizeHex(
      input?.successColor,
      DEFAULT_THEME_COLORS.successColor,
    ),
    warningColor: normalizeHex(
      input?.warningColor,
      DEFAULT_THEME_COLORS.warningColor,
    ),
    dangerColor: normalizeHex(
      input?.dangerColor,
      DEFAULT_THEME_COLORS.dangerColor,
    ),
  };
}

function hexToRgb(hex: string) {
  const n = normalizeHex(hex, "#000000").slice(1);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

/** Texto legible sobre el color de fondo */
export function contrastForeground(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#142014" : "#FFFFFF";
}

export function applyThemeColors(colors: ThemeColors) {
  if (typeof document === "undefined") return;
  const theme = normalizeThemeColors(colors);
  const root = document.documentElement;
  const pairs: Array<[string, string]> = [
    ["--accent", theme.accentColor],
    ["--accent-foreground", contrastForeground(theme.accentColor)],
    ["--focus", theme.accentColor],
    ["--success", theme.successColor],
    ["--success-foreground", contrastForeground(theme.successColor)],
    ["--warning", theme.warningColor],
    ["--warning-foreground", contrastForeground(theme.warningColor)],
    ["--danger", theme.dangerColor],
    ["--danger-foreground", contrastForeground(theme.dangerColor)],
  ];
  for (const [key, value] of pairs) {
    root.style.setProperty(key, value);
  }
}

export function readStoredThemeColors(): ThemeColors | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THEME_COLOR_STORAGE_KEY);
    if (!raw) return null;
    return normalizeThemeColors(JSON.parse(raw) as Partial<ThemeColors>);
  } catch {
    return null;
  }
}

export function storeThemeColors(colors: ThemeColors) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      THEME_COLOR_STORAGE_KEY,
      JSON.stringify(normalizeThemeColors(colors)),
    );
  } catch {
    // ignore
  }
}

/** Aplica colores y persiste en localStorage (sin evento). */
export function commitThemeColors(colors: ThemeColors): ThemeColors {
  const theme = normalizeThemeColors(colors);
  applyThemeColors(theme);
  storeThemeColors(theme);
  return theme;
}

/** Sincroniza colores en la pestaña actual y notifica a otros componentes locales. */
export function broadcastThemeColorsLocally(colors: ThemeColors): ThemeColors {
  const theme = commitThemeColors(colors);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(THEME_COLORS_UPDATED_EVENT, { detail: theme }),
    );
  }
  return theme;
}

export const THEME_COLORS_UPDATED_EVENT = "scheduly:theme-colors-updated";
export const THEME_COLORS_SOCKET_EVENT = "theme:colors-updated";

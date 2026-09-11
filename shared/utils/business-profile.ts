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

export const APP_BRAND_NAME = "Peluquería y Spa";

/** Nombre corto en la barra pública */
export const PUBLIC_BRAND_NAME = "Andrea Guerrero";

export const DEFAULT_BUSINESS_NAME = "Andrea Guerrero Estética y Peluquería";

export const DEFAULT_THEME_COLORS: ThemeColors = {
  accentColor: "#F0C14D",
  successColor: "#17C964",
  warningColor: "#F5A524",
  dangerColor: "#F31260",
};

/** @deprecated El tema HeroUI vive en app/globals.css */
export const THEME_COLOR_STORAGE_KEY = "scheduly.theme-colors.v4";

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

/** Acentos legacy → oro vivo */
const LEGACY_ACCENTS = new Set([
  "#7DFF7A",
  "#C8F542",
  "#F5C518",
  "#C4786A",
  "#3A9EA8",
  "#4AADB6",
]);

export function normalizeHex(value: unknown, fallback: string): string {
  const raw = String(value ?? "").trim();
  if (HEX_RE.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return fallback.toUpperCase();
}

export function normalizeThemeColors(
  input?: Partial<ThemeColors> | null,
): ThemeColors {
  let accentColor = normalizeHex(
    input?.accentColor,
    DEFAULT_THEME_COLORS.accentColor,
  );
  if (LEGACY_ACCENTS.has(accentColor)) {
    accentColor = DEFAULT_THEME_COLORS.accentColor;
  }

  let successColor = normalizeHex(
    input?.successColor,
    DEFAULT_THEME_COLORS.successColor,
  );
  if (successColor === "#5FD46A") {
    successColor = DEFAULT_THEME_COLORS.successColor;
  }

  return {
    accentColor,
    successColor,
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
  return luminance > 0.55 ? "#1A1408" : "#FFFFFF";
}

/** @deprecated Tema fijo en globals.css — no-op */
export function applyThemeColors(_colors: ThemeColors) {}

/** @deprecated Tema fijo en globals.css */
export function readStoredThemeColors(): ThemeColors | null {
  return null;
}

/** @deprecated Tema fijo en globals.css — no-op */
export function storeThemeColors(_colors: ThemeColors) {}

/** @deprecated Tema fijo en globals.css */
export function commitThemeColors(colors: ThemeColors): ThemeColors {
  return normalizeThemeColors(colors);
}

/** @deprecated Tema fijo en globals.css */
export function broadcastThemeColorsLocally(colors: ThemeColors): ThemeColors {
  return normalizeThemeColors(colors);
}

/** @deprecated */
export const THEME_COLORS_UPDATED_EVENT = "scheduly:theme-colors-updated";
/** @deprecated */
export const THEME_COLORS_SOCKET_EVENT = "theme:colors-updated";

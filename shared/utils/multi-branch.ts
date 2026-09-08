/**
 * Scheduly opera siempre en modo multi-local / multistock.
 * No existe modo “un solo local” y no se puede desactivar.
 */
export const SCHEDULY_DEPLOYMENT = {
  /** Feature key de producto (multistock) */
  featureKey: "multi_stock",
  /** @deprecated usar featureKey */
  gestorFeatureKey: "multi_stock",
  /** Nombre comercial del producto */
  productName: "Peluquería y Spa",
  /** Siempre true: stock por sucursal obligatorio */
  multiStockEnabled: true as const,
  /** Siempre true: varias sucursales/locales */
  multiBranchEnabled: true as const,
  /** No se puede volver a un solo local */
  canDisableMultiStock: false as const,
  canDisableMultiBranch: false as const,
} as const;

export function isMultiStockLockedOn(): boolean {
  return SCHEDULY_DEPLOYMENT.multiStockEnabled;
}

export function isMultiBranchLockedOn(): boolean {
  return SCHEDULY_DEPLOYMENT.multiBranchEnabled;
}

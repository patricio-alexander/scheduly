/**
 * Scheduly opera siempre en modo multi-local / multistock (como EdDeli).
 * No existe modo “un solo local” y no se puede desactivar.
 * Vinculado al feature del gestor: `multi_stock` (siempre habilitado en esta app).
 */
export const SCHEDULY_DEPLOYMENT = {
  /** Feature key en Gestor / Raptor Solutions */
  gestorFeatureKey: "multi_stock",
  /** Nombre comercial del producto */
  productName: "Scheduly",
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

/** Umbral de stock mínimo (alineado con la lista de productos) */
export const LOW_STOCK_THRESHOLD = 5;

export function isOutOfStock(stock: number) {
  return stock <= 0;
}

export function isLowStock(stock: number) {
  return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
}

export function isStockAlert(stock: number) {
  return stock <= LOW_STOCK_THRESHOLD;
}

export function stockAlertLabel(stock: number) {
  if (isOutOfStock(stock)) return "Sin stock";
  if (isLowStock(stock)) return "Stock bajo";
  return null;
}

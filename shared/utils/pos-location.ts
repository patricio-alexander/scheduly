/** Filtro POS: las vitrinas son puntos de entrega (SaleLine.deliveredStoreId), no caja propia. */

export function saleWhereForLocation(branchId: number | null) {
  if (!branchId) return {};
  return { lines: { some: { deliveredStoreId: branchId } } };
}

export function saleLineWhereForLocation(branchId: number | null) {
  if (!branchId) return {};
  return { deliveredStoreId: branchId };
}

export function linesForLocation<T extends { deliveredStoreId?: number | null }>(
  lines: T[],
  branchId: number | null,
) {
  if (!branchId) return lines;
  return lines.filter(
    (line) => line.deliveredStoreId == null || line.deliveredStoreId === branchId,
  );
}

export function locationKindLabel(kind: string | null | undefined) {
  if (kind === "vitrina") return "vitrina";
  if (kind === "bodega") return "bodega";
  if (kind === "propia") return "propia";
  return null;
}

/** Flags de configuración operativa (réplica lógica EdDeli, adaptada a Scheduly). */

export type OperationFlags = {
  /** Mostrar costo en selects de productos (compras / pedidos) */
  showProductCostInSelect: boolean;
  /** Admin puede corregir/anular movimientos financieros */
  financeAllowAdminCorrections: boolean;
  /** Crear producto desde buscador de caja */
  cajaAllowCreateProductFromSelect: boolean;
  /** Editar producto desde carrito de caja */
  cajaAllowEditProductFromCart: boolean;
  /** Checkbox «Mostrar stock» en el listado de caja */
  cajaShowStockToggle: boolean;
  /** Icono para poner la cantidad = stock disponible en el carrito */
  cajaAllowAutocompleteStock: boolean;
  /** Sugerir actualizar precio al cobrar si difiere del catálogo */
  cajaSuggestUpdateProductPrice: boolean;
  /** Mostrar Nº de línea en comprobantes */
  receiptShowLineNumber: boolean;
  /** Mostrar código en comprobantes */
  receiptShowBarcode: boolean;
  /** Mostrar unidad en comprobantes */
  receiptShowUnit: boolean;
  /** Aplicar formato a factura SRI */
  receiptApplyToFactura: boolean;
  /** Aplicar formato a nota / ticket POS */
  receiptApplyToNotaVenta: boolean;
  /** Catálogo público visible */
  showPublicCatalog: boolean;
  /** Mostrar sucursales en vista pública */
  showPublicBranches: boolean;
  /** Columna cliente visible en tablas de ventas */
  salesShowCustomerColumn: boolean;
  /** Columna proveedor visible en tablas de compras */
  purchasesShowSupplierColumn: boolean;
  /** Columna sucursal en ventas/compras */
  showBranchColumn: boolean;
};

export const DEFAULT_OPERATION_FLAGS: OperationFlags = {
  showProductCostInSelect: false,
  financeAllowAdminCorrections: true,
  cajaAllowCreateProductFromSelect: true,
  cajaAllowEditProductFromCart: true,
  cajaShowStockToggle: true,
  cajaAllowAutocompleteStock: true,
  cajaSuggestUpdateProductPrice: true,
  receiptShowLineNumber: true,
  receiptShowBarcode: false,
  receiptShowUnit: true,
  receiptApplyToFactura: true,
  receiptApplyToNotaVenta: true,
  showPublicCatalog: true,
  showPublicBranches: true,
  salesShowCustomerColumn: true,
  purchasesShowSupplierColumn: true,
  showBranchColumn: true,
};

export function normalizeOperationFlags(
  raw: unknown,
): OperationFlags {
  const src =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out = { ...DEFAULT_OPERATION_FLAGS };
  for (const key of Object.keys(DEFAULT_OPERATION_FLAGS) as Array<
    keyof OperationFlags
  >) {
    if (typeof src[key] === "boolean") {
      out[key] = src[key] as boolean;
    }
  }
  return out;
}

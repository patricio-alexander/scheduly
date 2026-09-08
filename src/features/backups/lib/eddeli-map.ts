/**
 * Mapa EdDeli backup.json → modelos Scheduly (misma estructura, nombres semánticos).
 * Agenda/Servicios no existen en EdDeli → se dejan vacíos al importar.
 */
export const EDDELI_TO_SCHEDULY_TABLE: Record<string, string> = {
  Roles: "Role",
  Users: "Person",
  Account: "Account",
  AccountRoles: "AccountRole",
  UserData: "PersonData",
  Notifications: "Notification",
  NotificationProgram: "NotificationProgram",
  NotificationDispatchLog: "NotificationDispatchLog",
  InventoryCategory: "Category",
  InventoryUnit: "Unit",
  InventoryProduct: "Product",
  InventoryRecipe: "Recipe",
  InventoryMovement: "StockMovement",
  InventoryBatch: "Batch",
  Store: "Branch",
  CashRegister: "CashRegister",
  StoreExhibidor: "BranchShelf",
  CashShift: "CashShift",
  CashShiftMovement: "CashShiftMovement",
  Customer: "Customer",
  Order: "Sale",
  OrderItem: "SaleLine",
  OrderPaymentInstallment: "SalePaymentInstallment",
  Supplier: "Supplier",
  SupplierOrder: "PurchaseOrder",
  SupplierOrderItem: "PurchaseOrderLine",
  SupplierOrderPaymentInstallment: "PurchaseOrderPaymentInstallment",
  SupplierProductCode: "SupplierProductCode",
  TaskPlan: "TaskPlan",
  TaskItem: "TaskItem",
  // Publicidad / TV / editor: omitidos a propósito (no en Scheduly aún)
  Expense: "Expense",
  Income: "Income",
  StoreStock: "BranchStock",
  RecurringExpenseTemplate: "RecurringExpenseTemplate",
  RecurringExpenseOccurrence: "RecurringExpenseOccurrence",
  HomeProduct: "HomeProduct",
  Catalog: "CatalogEntry",
  ProductCompareGroup: "ProductCompareGroup",
  ProductCompareGroupItem: "ProductCompareGroupItem",
  PricingTierGroup: "PricingTierGroup",
  StoreProduct: "BranchProduct",
  ItemGroup: "ItemGroup",
  ItemGroupItem: "ItemGroupItem",
  Payment: "FinancePayment",
  SupplierOrderPayment: "SupplierOrderPayment",
  SupplierPack: "SupplierPack",
  SupplierPackItem: "SupplierPackItem",
  DocumentAttachment: "DocumentAttachment",
  FinancialObligation: "FinancialObligation",
  ObligationPayment: "ObligationPayment",
  License: "License",
  Logs: "SystemLog",
  AppSettings: "AppSettings",
  AppEntitlement: "AppEntitlement",
  SriBillingSettings: "SriBillingSettings",
  ElectronicInvoice: "ElectronicInvoice",
};

/** Tablas EdDeli que se ignoran al importar (TV / publicidad / editor). */
export const EDDELI_SKIPPED_TABLES = [
  "PublicidadCampaign",
  "PublicidadPlaylistItem",
  "PublicidadDevice",
  "MediaAsset",
  "EditorTemplate",
  "EditorTemplateGroup",
  "EditorTemplateLayer",
  "EditorLayerProp",
  "EditorLayerBind",
  "EditorDesign",
  "EditorDesignLayerOverride",
] as const;

export function isEdDeliBackupPayload(source: Record<string, unknown>): boolean {
  // Firma EdDeli: tablas con prefijo Inventory* o el par Users+Account+Store
  if (Array.isArray(source.InventoryProduct) || Array.isArray(source.InventoryCategory)) {
    return true;
  }
  return (
    Array.isArray(source.Users) &&
    Array.isArray(source.Account) &&
    (Array.isArray(source.Store) || Array.isArray(source.Order))
  );
}

export type BackupTableCount = {
  from: string;
  to: string;
  rows: number;
};

export type BackupPreview = {
  /** Siempre reemplazo total: borra las tablas y carga el JSON. No sincroniza. */
  mode: "replace";
  sourceKind: "eddeli" | "scheduly";
  sourceTables: number;
  sourceRows: number;
  importTables: number;
  importRows: number;
  mapped: BackupTableCount[];
  skipped: BackupTableCount[];
  unknown: BackupTableCount[];
};

function arrayLen(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/** Cuenta tablas/filas del JSON (EdDeli o Scheduly) y qué se importará. */
export function analyzeBackupObject(
  source: Record<string, unknown>,
): BackupPreview {
  const arrayEntries = Object.entries(source).filter(([, v]) => Array.isArray(v));
  const sourceTables = arrayEntries.length;
  const sourceRows = arrayEntries.reduce(
    (sum, [, v]) => sum + (v as unknown[]).length,
    0,
  );

  const skipped: BackupTableCount[] = [];
  const unknown: BackupTableCount[] = [];
  const mapped: BackupTableCount[] = [];

  if (isEdDeliBackupPayload(source)) {
    const skippedSet = new Set<string>(EDDELI_SKIPPED_TABLES);
    const mappedSet = new Set(Object.keys(EDDELI_TO_SCHEDULY_TABLE));

    for (const [from, to] of Object.entries(EDDELI_TO_SCHEDULY_TABLE)) {
      mapped.push({ from, to, rows: arrayLen(source[from]) });
    }

    for (const [key, value] of arrayEntries) {
      const rows = (value as unknown[]).length;
      if (skippedSet.has(key)) {
        skipped.push({ from: key, to: "—", rows });
      } else if (!mappedSet.has(key)) {
        unknown.push({ from: key, to: "—", rows });
      }
    }
  } else {
    for (const [key, value] of arrayEntries) {
      mapped.push({ from: key, to: key, rows: (value as unknown[]).length });
    }
  }

  const importRows = mapped.reduce((sum, row) => sum + row.rows, 0);
  const importTables = mapped.filter((row) => row.rows > 0).length;

  return {
    mode: "replace",
    sourceKind: isEdDeliBackupPayload(source) ? "eddeli" : "scheduly",
    sourceTables,
    sourceRows,
    importTables,
    importRows,
    mapped: mapped.sort((a, b) => b.rows - a.rows),
    skipped: skipped.sort((a, b) => b.rows - a.rows),
    unknown: unknown.sort((a, b) => b.rows - a.rows),
  };
}

export function analyzeBackupJson(raw: string): BackupPreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("El archivo no es JSON válido");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("El JSON debe ser un objeto con tablas");
  }
  const preview = analyzeBackupObject(parsed as Record<string, unknown>);
  if (preview.sourceRows === 0) {
    throw new Error("El JSON no contiene filas para importar");
  }
  return preview;
}

/** Remapea claves EdDeli → Scheduly. Filas se copian tal cual (mismos campos). */
export function remapEdDeliBackupToScheduly(
  source: Record<string, unknown>,
): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {};
  for (const [edKey, schedKey] of Object.entries(EDDELI_TO_SCHEDULY_TABLE)) {
    const rows = source[edKey];
    out[schedKey] = Array.isArray(rows) ? (rows as unknown[]) : [];
  }
  // Extras Scheduly (no vienen de EdDeli)
  for (const extra of [
    "Service",
    "Appointment",
    "AppointmentService",
    "AppointmentProduct",
    "AppointmentPayment",
    "ServiceBranch",
    "ServicePromotion",
    "LoyaltySettings",
    "CustomerLoyalty",
    "PointTransaction",
    "Reward",
    "FeedPost",
    "CommissionRecord",
  ]) {
    if (!out[extra]) out[extra] = [];
  }
  return out;
}

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

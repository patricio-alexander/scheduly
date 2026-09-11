import fs from "fs/promises";
import path from "path";
import { prisma } from "@/shared/utils/prisma";
import {
  BACKUP_TABLE_KEYS,
  type BackupTableKey,
} from "./backup-table-keys";

export { BACKUP_TABLE_KEYS, type BackupTableKey };

/** Carpeta de backups (como EdDeli / Gestor). */
export const BACKUPS_DIR = path.join(process.cwd(), "backups");
export const MAIN_BACKUP_PATH = path.join(BACKUPS_DIR, "backup.json");

export type DbClient = typeof prisma;

type Delegate = {
  findMany: (args?: object) => Promise<unknown[]>;
};

export function backupTableDelegate(
  db: DbClient,
  key: BackupTableKey,
): Delegate {
  switch (key) {
    case "Role":
      return db.role;
    case "Person":
      return db.person;
    case "Account":
      return db.account;
    case "AccountRole":
      return db.accountRole;
    case "AccountBranch": {
      const d = (db as { accountBranch?: Delegate }).accountBranch;
      if (d) return d;
      // Client Prisma aún sin generate: backup/wipe lo omite
      return {
        findMany: async () => [],
      };
    }
    case "PersonData":
      return db.personData;
    case "Notification":
      return db.notification;
    case "NotificationProgram":
      return db.notificationProgram;
    case "NotificationDispatchLog":
      return db.notificationDispatchLog;
    case "Category":
      return db.category;
    case "Unit":
      return db.unit;
    case "Product":
      return db.product;
    case "Recipe":
      return db.recipe;
    case "StockMovement":
      return db.stockMovement;
    case "Batch":
      return db.batch;
    case "Branch":
      return db.branch;
    case "CashRegister":
      return db.cashRegister;
    case "BranchShelf":
      return db.branchShelf;
    case "CashShift":
      return db.cashShift;
    case "CashShiftMovement":
      return db.cashShiftMovement;
    case "Customer":
      return db.customer;
    case "Sale":
      return db.sale;
    case "SaleLine":
      return db.saleLine;
    case "SalePaymentInstallment":
      return db.salePaymentInstallment;
    case "Supplier":
      return db.supplier;
    case "PurchaseOrder":
      return db.purchaseOrder;
    case "PurchaseOrderLine":
      return db.purchaseOrderLine;
    case "PurchaseOrderPaymentInstallment":
      return db.purchaseOrderPaymentInstallment;
    case "SupplierProductCode":
      return db.supplierProductCode;
    case "TaskPlan":
      return db.taskPlan;
    case "TaskItem":
      return db.taskItem;
    case "Expense":
      return db.expense;
    case "Income":
      return db.income;
    case "BranchStock":
      return db.branchStock;
    case "RecurringExpenseTemplate":
      return db.recurringExpenseTemplate;
    case "RecurringExpenseOccurrence":
      return db.recurringExpenseOccurrence;
    case "HomeProduct":
      return db.homeProduct;
    case "CatalogEntry":
      return db.catalogEntry;
    case "ProductCompareGroup":
      return db.productCompareGroup;
    case "ProductCompareGroupItem":
      return db.productCompareGroupItem;
    case "PricingTierGroup":
      return db.pricingTierGroup;
    case "BranchProduct":
      return db.branchProduct;
    case "ItemGroup":
      return db.itemGroup;
    case "ItemGroupItem":
      return db.itemGroupItem;
    case "FinancePayment":
      return db.financePayment;
    case "SupplierOrderPayment":
      return db.supplierOrderPayment;
    case "SupplierPack":
      return db.supplierPack;
    case "SupplierPackItem":
      return db.supplierPackItem;
    case "DocumentAttachment":
      return db.documentAttachment;
    case "FinancialObligation":
      return db.financialObligation;
    case "ObligationPayment":
      return db.obligationPayment;
    case "License":
      return db.license;
    case "SystemLog":
      return db.systemLog;
    case "AppSettings":
      return db.appSettings;
    case "AppEntitlement":
      return db.appEntitlement;
    case "SriBillingSettings":
      return db.sriBillingSettings;
    case "ElectronicInvoice":
      return db.electronicInvoice;
    case "Service":
      return db.service;
    case "Appointment":
      return db.appointment;
    case "AppointmentService":
      return db.appointmentService;
    case "AppointmentProduct":
      return db.appointmentProduct;
    case "AppointmentPayment":
      return db.appointmentPayment;
    case "ServiceBranch":
      return db.serviceBranch;
    case "ServicePromotion":
      return db.servicePromotion;
    case "LoyaltySettings":
      return db.loyaltySettings;
    case "CustomerLoyalty":
      return db.customerLoyalty;
    case "PointTransaction":
      return db.pointTransaction;
    case "Reward":
      return db.reward;
    case "FeedPost":
      return db.feedPost;
    case "CommissionRecord":
      return db.commissionRecord;
    default: {
      const _exhaustive: never = key;
      throw new Error(`Tabla de backup desconocida: ${_exhaustive}`);
    }
  }
}

export const BACKUP_TABLE_ENTRIES: {
  key: BackupTableKey;
  get: (db?: DbClient) => Delegate;
}[] = BACKUP_TABLE_KEYS.map((key) => ({
  key,
  get: (db: DbClient = prisma) => backupTableDelegate(db, key),
}));

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return value;
}

export function summarizeBackupData(data: Record<string, unknown[]>) {
  const counts: Record<string, number> = {};
  let totalRows = 0;
  for (const [key, rows] of Object.entries(data)) {
    const n = Array.isArray(rows) ? rows.length : 0;
    counts[key] = n;
    totalRows += n;
  }
  return { counts, totalRows };
}

export async function ensureBackupsDir() {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
}

export async function dumpDatabaseToJson(): Promise<Record<string, unknown[]>> {
  const data: Record<string, unknown[]> = {};
  for (const entry of BACKUP_TABLE_ENTRIES) {
    const rows = await entry.get().findMany();
    data[entry.key] = serializeValue(rows) as unknown[];
  }
  return data;
}

function timestampSuffix(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
}

/** Exporta BD → copia fechada + backup.json fijo. */
export async function saveBackup(options?: { updateMain?: boolean }) {
  const updateMain = options?.updateMain ?? true;
  await ensureBackupsDir();

  const data = await dumpDatabaseToJson();
  const payload = JSON.stringify(data, null, 2);
  const filename = `backup-scheduly-${timestampSuffix()}.json`;
  const storedPath = path.join(BACKUPS_DIR, filename);

  await fs.writeFile(storedPath, payload, "utf8");
  if (updateMain) {
    await fs.writeFile(MAIN_BACKUP_PATH, payload, "utf8");
  }

  const summary = summarizeBackupData(data);
  return {
    filename,
    storedPath,
    mainPath: MAIN_BACKUP_PATH,
    sizeBytes: Buffer.byteLength(payload, "utf8"),
    ...summary,
  };
}

export async function getMainBackupInfo() {
  try {
    const st = await fs.stat(MAIN_BACKUP_PATH);
    const raw = await fs.readFile(MAIN_BACKUP_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown[]>;
    const summary = summarizeBackupData(parsed);
    return {
      exists: true,
      path: MAIN_BACKUP_PATH,
      filename: "backup.json",
      sizeBytes: st.size,
      sizeMB: Number((st.size / (1024 * 1024)).toFixed(3)),
      modifiedAt: st.mtime.toISOString(),
      ...summary,
    };
  } catch {
    return {
      exists: false,
      path: MAIN_BACKUP_PATH,
      filename: "backup.json",
      sizeBytes: 0,
      sizeMB: 0,
      modifiedAt: null as string | null,
      counts: {} as Record<string, number>,
      totalRows: 0,
    };
  }
}

export async function listStoredBackups() {
  await ensureBackupsDir();
  const names = await fs.readdir(BACKUPS_DIR);
  const stored = [];

  for (const name of names) {
    if (name === "backup.json" || !name.endsWith(".json")) continue;
    if (
      !name.startsWith("backup-scheduly-") &&
      !name.startsWith("backup-scheduly-import-") &&
      !name.startsWith("backup-eddeli-")
    ) {
      continue;
    }
    const full = path.join(BACKUPS_DIR, name);
    const st = await fs.stat(full);
    if (!st.isFile()) continue;
    stored.push({
      filename: name,
      sizeBytes: st.size,
      sizeMB: Number((st.size / (1024 * 1024)).toFixed(3)),
      modifiedAt: st.mtime.toISOString(),
    });
  }

  stored.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));
  return stored;
}

export function isSafeBackupFilename(filename: string) {
  return (
    filename === "backup.json" ||
    ((/^backup-scheduly(?:-import)?-[\w.-]+\.json$/.test(filename) ||
      /^backup-eddeli-[\w.-]+\.json$/.test(filename)) &&
      !filename.includes(".."))
  );
}

export async function readBackupFile(filename: string) {
  if (!isSafeBackupFilename(filename)) {
    throw new Error("Nombre de archivo no permitido");
  }
  const full =
    filename === "backup.json"
      ? MAIN_BACKUP_PATH
      : path.join(BACKUPS_DIR, filename);
  const content = await fs.readFile(full);
  return { full, content };
}

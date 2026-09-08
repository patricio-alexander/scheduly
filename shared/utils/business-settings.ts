import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/shared/utils/prisma";
import {
  DEFAULT_BUSINESS_NAME,
  DEFAULT_THEME_COLORS,
  normalizeThemeColors,
  type BusinessProfile,
  type ThemeColors,
} from "@/shared/utils/business-profile";
import {
  normalizeOperationFlags,
  type OperationFlags,
} from "@/shared/utils/operation-flags";
import {
  agendaHoursFromReceiptSettings,
  mergeAgendaHoursIntoReceiptSettings,
  normalizeAgendaHours,
  type AgendaHours,
} from "@/shared/utils/agenda-hours";
import {
  cashRegisterModeFromReceiptSettings,
  mergeOpsIntoReceiptSettings,
  normalizeCashRegisterMode,
  type CashRegisterMode,
  DEFAULT_CASH_REGISTER_MODE,
} from "@/shared/utils/cash-register-mode";

export type { BusinessProfile, ThemeColors, AgendaHours, CashRegisterMode };
export { DEFAULT_BUSINESS_NAME, DEFAULT_THEME_COLORS, DEFAULT_CASH_REGISTER_MODE };

export type BusinessSettingsFull = BusinessProfile & {
  operationFlags: OperationFlags;
  cashRegisterMode: CashRegisterMode;
} & AgendaHours;

async function ensureAppSettings() {
  const existing = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.appSettings.create({
    data: {
      id: 1,
      name: DEFAULT_BUSINESS_NAME,
      alias: "scheduly",
      ...DEFAULT_THEME_COLORS,
    },
  });
}

async function ensureSriSettings() {
  const existing = await prisma.sriBillingSettings.findUnique({
    where: { id: 1 },
  });
  if (existing) return existing;
  return prisma.sriBillingSettings.create({ data: { id: 1 } });
}

function toProfile(
  app: {
    name: string;
    logoPath: string | null;
    accentColor?: string | null;
    successColor?: string | null;
    warningColor?: string | null;
    dangerColor?: string | null;
    operationFlags?: unknown;
    receiptDetailSettings?: string | null;
  },
  sri: {
    ruc?: string | null;
    tradeName?: string | null;
    matrixAddress?: string | null;
    establishmentAddress?: string | null;
    accountingRequired?: boolean | null;
  },
): BusinessSettingsFull {
  const colors = normalizeThemeColors({
    accentColor: app.accentColor ?? undefined,
    successColor: app.successColor ?? undefined,
    warningColor: app.warningColor ?? undefined,
    dangerColor: app.dangerColor ?? undefined,
  });
  const hours = agendaHoursFromReceiptSettings(app.receiptDetailSettings);
  const cashRegisterMode = cashRegisterModeFromReceiptSettings(
    app.receiptDetailSettings,
  );
  return {
    businessName: app.name || DEFAULT_BUSINESS_NAME,
    address: sri.matrixAddress ?? sri.establishmentAddress ?? "",
    logoPath: app.logoPath,
    ruc: sri.ruc ?? "",
    tradeName: sri.tradeName ?? "",
    obligationAccounting: sri.accountingRequired ?? true,
    ...colors,
    operationFlags: normalizeOperationFlags(app.operationFlags),
    ...hours,
    cashRegisterMode,
  };
}

export async function getBusinessSettings(): Promise<BusinessSettingsFull> {
  const [app, sri] = await Promise.all([
    ensureAppSettings(),
    ensureSriSettings(),
  ]);
  return toProfile(app, sri);
}

export async function getAgendaHours(): Promise<AgendaHours> {
  const settings = await getBusinessSettings();
  return {
    bookingStartHour: settings.bookingStartHour,
    bookingEndHour: settings.bookingEndHour,
  };
}

export async function getCashRegisterMode(): Promise<CashRegisterMode> {
  const settings = await getBusinessSettings();
  return settings.cashRegisterMode;
}

export async function updateBusinessSettings(input: {
  businessName: string;
  address: string;
  ruc?: string;
  tradeName?: string;
  obligationAccounting?: boolean;
  accentColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  operationFlags?: OperationFlags;
  bookingStartHour?: number;
  bookingEndHour?: number;
  cashRegisterMode?: CashRegisterMode;
}): Promise<BusinessSettingsFull> {
  const businessName = input.businessName.trim() || DEFAULT_BUSINESS_NAME;
  const address = input.address.trim();
  const currentApp = await ensureAppSettings();
  const current = toProfile(currentApp, await ensureSriSettings());
  const colors = normalizeThemeColors({
    accentColor: input.accentColor ?? current.accentColor,
    successColor: input.successColor ?? current.successColor,
    warningColor: input.warningColor ?? current.warningColor,
    dangerColor: input.dangerColor ?? current.dangerColor,
  });
  const operationFlags = input.operationFlags
    ? normalizeOperationFlags(input.operationFlags)
    : current.operationFlags;
  const hours = normalizeAgendaHours({
    bookingStartHour:
      input.bookingStartHour !== undefined
        ? input.bookingStartHour
        : current.bookingStartHour,
    bookingEndHour:
      input.bookingEndHour !== undefined
        ? input.bookingEndHour
        : current.bookingEndHour,
  });
  const cashRegisterMode = normalizeCashRegisterMode(
    input.cashRegisterMode !== undefined
      ? input.cashRegisterMode
      : current.cashRegisterMode,
  );
  const receiptDetailSettings = mergeOpsIntoReceiptSettings(
    mergeAgendaHoursIntoReceiptSettings(currentApp.receiptDetailSettings, hours),
    { cashRegisterMode },
  );

  const [app, sri] = await Promise.all([
    prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        name: businessName,
        alias: "scheduly",
        logoPath: null,
        operationFlags,
        receiptDetailSettings,
        ...colors,
      },
      update: {
        name: businessName,
        operationFlags,
        receiptDetailSettings,
        ...colors,
      },
    }),
    prisma.sriBillingSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        ruc: input.ruc?.trim() ?? "",
        tradeName: input.tradeName?.trim() ?? "",
        matrixAddress: address,
        accountingRequired: input.obligationAccounting ?? true,
      },
      update: {
        ...(input.ruc !== undefined ? { ruc: input.ruc.trim() } : {}),
        ...(input.tradeName !== undefined
          ? { tradeName: input.tradeName.trim() }
          : {}),
        matrixAddress: address,
        ...(input.obligationAccounting !== undefined
          ? { accountingRequired: input.obligationAccounting }
          : {}),
      },
    }),
  ]);

  return toProfile(app, sri);
}

const ALLOWED_LOGO_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function saveBusinessLogo(
  file: File,
): Promise<BusinessSettingsFull> {
  const ext = ALLOWED_LOGO_TYPES[file.type];
  if (!ext) {
    throw new Error("Formato de imagen no permitido (PNG, JPG, WEBP o SVG)");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("El logo no puede superar 2 MB");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const current = await getBusinessSettings();
  if (current.logoPath?.startsWith("/uploads/")) {
    const prev = path.join(process.cwd(), "public", current.logoPath);
    await unlink(prev).catch(() => undefined);
  }

  const filename = `business-logo${ext}`;
  const absolute = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolute, buffer);

  const logoPath = `/uploads/${filename}`;
  await ensureAppSettings();
  await prisma.appSettings.update({
    where: { id: 1 },
    data: { logoPath },
  });

  return getBusinessSettings();
}

export async function clearBusinessLogo(): Promise<BusinessSettingsFull> {
  const current = await getBusinessSettings();
  if (current.logoPath?.startsWith("/uploads/")) {
    const prev = path.join(process.cwd(), "public", current.logoPath);
    await unlink(prev).catch(() => undefined);
  }

  await ensureAppSettings();
  await prisma.appSettings.update({
    where: { id: 1 },
    data: { logoPath: null },
  });

  return getBusinessSettings();
}

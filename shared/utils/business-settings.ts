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

export type { BusinessProfile, ThemeColors };
export { DEFAULT_BUSINESS_NAME, DEFAULT_THEME_COLORS };

export type BusinessSettingsFull = BusinessProfile & {
  operationFlags: OperationFlags;
};

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
  return {
    businessName: app.name || DEFAULT_BUSINESS_NAME,
    address: sri.matrixAddress ?? sri.establishmentAddress ?? "",
    logoPath: app.logoPath,
    ruc: sri.ruc ?? "",
    tradeName: sri.tradeName ?? "",
    obligationAccounting: sri.accountingRequired ?? true,
    ...colors,
    operationFlags: normalizeOperationFlags(app.operationFlags),
  };
}

export async function getBusinessSettings(): Promise<BusinessSettingsFull> {
  const [app, sri] = await Promise.all([
    ensureAppSettings(),
    ensureSriSettings(),
  ]);
  return toProfile(app, sri);
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
}): Promise<BusinessSettingsFull> {
  const businessName = input.businessName.trim() || DEFAULT_BUSINESS_NAME;
  const address = input.address.trim();
  const current = await getBusinessSettings();
  const colors = normalizeThemeColors({
    accentColor: input.accentColor ?? current.accentColor,
    successColor: input.successColor ?? current.successColor,
    warningColor: input.warningColor ?? current.warningColor,
    dangerColor: input.dangerColor ?? current.dangerColor,
  });
  const operationFlags = input.operationFlags
    ? normalizeOperationFlags(input.operationFlags)
    : current.operationFlags;

  const [app, sri] = await Promise.all([
    prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        name: businessName,
        alias: "scheduly",
        logoPath: null,
        operationFlags,
        ...colors,
      },
      update: {
        name: businessName,
        operationFlags,
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

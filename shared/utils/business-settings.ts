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

export type { BusinessProfile, ThemeColors };
export { DEFAULT_BUSINESS_NAME, DEFAULT_THEME_COLORS };

function toProfile(row: {
  businessName: string;
  address: string;
  logoPath: string | null;
  accentColor?: string | null;
  successColor?: string | null;
  warningColor?: string | null;
  dangerColor?: string | null;
}): BusinessProfile {
  const colors = normalizeThemeColors({
    accentColor: row.accentColor ?? undefined,
    successColor: row.successColor ?? undefined,
    warningColor: row.warningColor ?? undefined,
    dangerColor: row.dangerColor ?? undefined,
  });
  return {
    businessName: row.businessName || DEFAULT_BUSINESS_NAME,
    address: row.address ?? "",
    logoPath: row.logoPath,
    ...colors,
  };
}

export async function getBusinessSettings(): Promise<BusinessProfile> {
  const row =
    (await prisma.businessSettings.findUnique({ where: { id: 1 } })) ??
    (await prisma.businessSettings.create({
      data: {
        id: 1,
        businessName: DEFAULT_BUSINESS_NAME,
        address: "",
        logoPath: null,
        ...DEFAULT_THEME_COLORS,
      },
    }));

  return toProfile(row);
}

export async function updateBusinessSettings(input: {
  businessName: string;
  address: string;
  accentColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
}): Promise<BusinessProfile> {
  const businessName = input.businessName.trim() || DEFAULT_BUSINESS_NAME;
  const address = input.address.trim();
  const current = await getBusinessSettings();
  const colors = normalizeThemeColors({
    accentColor: input.accentColor ?? current.accentColor,
    successColor: input.successColor ?? current.successColor,
    warningColor: input.warningColor ?? current.warningColor,
    dangerColor: input.dangerColor ?? current.dangerColor,
  });

  const row = await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      businessName,
      address,
      logoPath: null,
      ...colors,
    },
    update: {
      businessName,
      address,
      ...colors,
    },
  });

  return toProfile(row);
}

const ALLOWED_LOGO_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function saveBusinessLogo(file: File): Promise<BusinessProfile> {
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
  const row = await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      businessName: DEFAULT_BUSINESS_NAME,
      address: "",
      logoPath,
      ...DEFAULT_THEME_COLORS,
    },
    update: { logoPath },
  });

  return toProfile(row);
}

export async function clearBusinessLogo(): Promise<BusinessProfile> {
  const current = await getBusinessSettings();
  if (current.logoPath?.startsWith("/uploads/")) {
    const prev = path.join(process.cwd(), "public", current.logoPath);
    await unlink(prev).catch(() => undefined);
  }

  const row = await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      businessName: DEFAULT_BUSINESS_NAME,
      address: "",
      logoPath: null,
      ...DEFAULT_THEME_COLORS,
    },
    update: { logoPath: null },
  });

  return toProfile(row);
}

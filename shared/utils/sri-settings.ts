import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/shared/utils/prisma";
import { encryptSecret } from "@/shared/utils/secret-crypto";

export type SriPublicStatus = {
  enabled: boolean;
  environment: "pruebas" | "produccion";
  ruc: string;
  legalName: string;
  tradeName: string;
  matrixAddress: string;
  establishmentAddress: string;
  establishmentCode: string;
  emissionPointCode: string;
  phone: string;
  email: string;
  accountingRequired: boolean;
  specialTaxpayerResolution: string;
  taxRegime: string;
  nextInvoiceSequential: number;
  notes: string;
  hasCertificate: boolean;
  certFileName: string | null;
  uploadedAt: string | null;
  autoEmitOnPayment: boolean;
  readyForInvoicing: boolean;
  enableSendInvoiceEmail: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFrom: string;
  hasSmtpPassword: boolean;
  smtpReady: boolean;
  invoiceEmailDailyLimit: number;
};

const SRI_DIR = path.join(process.cwd(), "storage", "sri");
const MAX_CERT_BYTES = 5 * 1024 * 1024;

function normalizeEnvironment(value: unknown): "pruebas" | "produccion" {
  return String(value ?? "").toLowerCase() === "produccion"
    ? "produccion"
    : "pruebas";
}

function normalizeRuc(value: string) {
  return value.replace(/\D/g, "").slice(0, 13);
}

function padCode(value: unknown, fallback = "001") {
  const digits = String(value ?? "").replace(/\D/g, "");
  return (digits || fallback).padStart(3, "0").slice(-3);
}

export async function ensureSriRow() {
  const existing = await prisma.sriBillingSettings.findUnique({
    where: { id: 1 },
  });
  if (existing) return existing;
  return prisma.sriBillingSettings.create({
    data: { id: 1, environment: "pruebas" },
  });
}

function isReady(row: {
  enabled: boolean;
  ruc: string | null;
  legalName: string | null;
  matrixAddress: string | null;
  establishmentCode: string;
  emissionPointCode: string;
  certificateRelativePath: string | null;
  certificatePasswordEnc: string | null;
  certificateFileName: string | null;
}) {
  const ruc = normalizeRuc(row.ruc ?? "");
  return (
    row.enabled &&
    ruc.length === 13 &&
    Boolean(row.legalName?.trim()) &&
    Boolean(row.matrixAddress?.trim()) &&
    Boolean(row.establishmentCode?.trim()) &&
    Boolean(row.emissionPointCode?.trim()) &&
    Boolean(row.certificateRelativePath && row.certificateFileName) &&
    Boolean(row.certificatePasswordEnc)
  );
}

function toPublic(
  row: Awaited<ReturnType<typeof ensureSriRow>>,
): SriPublicStatus {
  const hasCertificate = Boolean(
    row.certificateRelativePath && row.certificateFileName,
  );
  const smtpHost = row.smtpHost?.trim() ?? "";
  const smtpUser = row.smtpUser?.trim() ?? "";
  return {
    enabled: row.enabled,
    environment: normalizeEnvironment(row.environment),
    ruc: row.ruc ?? "",
    legalName: row.legalName ?? "",
    tradeName: row.tradeName ?? "",
    matrixAddress: row.matrixAddress ?? "",
    establishmentAddress: row.establishmentAddress ?? "",
    establishmentCode: row.establishmentCode || "001",
    emissionPointCode: row.emissionPointCode || "001",
    phone: row.phone ?? "",
    email: row.email ?? "",
    accountingRequired: row.accountingRequired,
    specialTaxpayerResolution: row.specialTaxpayerResolution ?? "",
    taxRegime: row.taxRegime ?? "",
    nextInvoiceSequential: row.nextInvoiceSequential ?? 1,
    notes: row.notes ?? "",
    hasCertificate,
    certFileName: row.certificateFileName,
    uploadedAt: row.certificateUploadedAt
      ? row.certificateUploadedAt.toISOString()
      : null,
    autoEmitOnPayment: row.enabled,
    readyForInvoicing: isReady(row),
    enableSendInvoiceEmail: row.enableSendInvoiceEmail,
    smtpHost,
    smtpPort: row.smtpPort ?? 587,
    smtpSecure: row.smtpSecure,
    smtpUser,
    smtpFrom: row.smtpFrom ?? "",
    hasSmtpPassword: Boolean(row.smtpPassEnc),
    smtpReady: Boolean(smtpHost && smtpUser && row.smtpPassEnc),
    invoiceEmailDailyLimit: row.invoiceEmailDailyLimit ?? 80,
  };
}

export async function getSriStatus(): Promise<SriPublicStatus> {
  return toPublic(await ensureSriRow());
}

export type SriStatus = SriPublicStatus;

export async function updateSriBillingFields(
  input: Record<string, unknown>,
): Promise<SriPublicStatus> {
  await ensureSriRow();
  const data: Record<string, unknown> = {};

  if (input.enabled !== undefined) data.enabled = Boolean(input.enabled);
  if (input.autoEmitOnPayment !== undefined) {
    data.enabled = Boolean(input.autoEmitOnPayment);
  }
  if (input.environment !== undefined) {
    data.environment = normalizeEnvironment(input.environment);
  }
  if (input.ruc !== undefined) data.ruc = normalizeRuc(String(input.ruc));
  if (input.legalName !== undefined) {
    data.legalName = String(input.legalName).trim();
  }
  if (input.tradeName !== undefined) {
    data.tradeName = String(input.tradeName).trim();
  }
  if (input.matrixAddress !== undefined) {
    data.matrixAddress = String(input.matrixAddress).trim();
  }
  if (input.establishmentAddress !== undefined) {
    data.establishmentAddress = String(input.establishmentAddress).trim();
  }
  if (input.establishmentCode !== undefined) {
    data.establishmentCode = padCode(input.establishmentCode);
  }
  if (input.emissionPointCode !== undefined) {
    data.emissionPointCode = padCode(input.emissionPointCode);
  }
  if (input.phone !== undefined) data.phone = String(input.phone).trim();
  if (input.email !== undefined) data.email = String(input.email).trim();
  if (input.accountingRequired !== undefined) {
    data.accountingRequired = Boolean(input.accountingRequired);
  }
  if (input.specialTaxpayerResolution !== undefined) {
    data.specialTaxpayerResolution = String(
      input.specialTaxpayerResolution,
    ).trim();
  }
  if (input.taxRegime !== undefined) {
    data.taxRegime = String(input.taxRegime).trim();
  }
  if (input.nextInvoiceSequential !== undefined) {
    const n = Number(input.nextInvoiceSequential);
    data.nextInvoiceSequential =
      Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }
  if (input.notes !== undefined) data.notes = String(input.notes);
  if (input.enableSendInvoiceEmail !== undefined) {
    data.enableSendInvoiceEmail = Boolean(input.enableSendInvoiceEmail);
  }
  if (input.smtpHost !== undefined) {
    data.smtpHost = String(input.smtpHost).trim();
  }
  if (input.smtpPort !== undefined) {
    const port = Number(input.smtpPort);
    data.smtpPort = Number.isFinite(port) ? port : 587;
  }
  if (input.smtpSecure !== undefined) {
    data.smtpSecure = Boolean(input.smtpSecure);
  }
  if (input.smtpUser !== undefined) {
    data.smtpUser = String(input.smtpUser).trim();
  }
  if (input.smtpFrom !== undefined) {
    data.smtpFrom = String(input.smtpFrom).trim();
  }
  if (input.invoiceEmailDailyLimit !== undefined) {
    const limit = Number(input.invoiceEmailDailyLimit);
    data.invoiceEmailDailyLimit =
      Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 80;
  }

  const smtpPassword = String(input.smtpPassword ?? input.smtpPass ?? "").trim();
  if (smtpPassword) data.smtpPassEnc = encryptSecret(smtpPassword);

  const certPassword = String(
    input.certificatePassword ?? input.certPassword ?? "",
  ).trim();
  if (certPassword) data.certificatePasswordEnc = encryptSecret(certPassword);

  const row = await prisma.sriBillingSettings.update({
    where: { id: 1 },
    data,
  });
  return toPublic(row);
}

export async function saveSriCertificate(input: {
  file: File;
  password: string;
  environment: unknown;
}): Promise<SriPublicStatus> {
  const password = input.password.trim();
  if (!password) {
    throw new Error("La contraseña del certificado es obligatoria");
  }

  const name = input.file.name.toLowerCase();
  const isP12 =
    name.endsWith(".p12") ||
    name.endsWith(".pfx") ||
    input.file.type === "application/x-pkcs12" ||
    input.file.type === "application/pkcs12";

  if (!isP12) {
    throw new Error("El archivo debe ser un certificado .p12 o .pfx");
  }
  if (input.file.size > MAX_CERT_BYTES) {
    throw new Error("El certificado no puede superar 5 MB");
  }

  await mkdir(SRI_DIR, { recursive: true });
  const current = await ensureSriRow();

  if (current.certificateRelativePath) {
    const prev = path.isAbsolute(current.certificateRelativePath)
      ? current.certificateRelativePath
      : path.join(process.cwd(), current.certificateRelativePath);
    await unlink(prev).catch(() => undefined);
  }

  const ext = name.endsWith(".pfx") ? ".pfx" : ".p12";
  const filename = `firma-electronica${ext}`;
  const absolute = path.join(SRI_DIR, filename);
  const relative = path.join("storage", "sri", filename);
  await writeFile(absolute, Buffer.from(await input.file.arrayBuffer()), {
    mode: 0o600,
  });

  const row = await prisma.sriBillingSettings.update({
    where: { id: 1 },
    data: {
      certificateFileName: input.file.name,
      certificateRelativePath: relative,
      certificatePasswordEnc: encryptSecret(password),
      environment: normalizeEnvironment(input.environment),
      certificateUploadedAt: new Date(),
    },
  });

  return toPublic(row);
}

export async function updateSriEnvironment(
  environment: unknown,
  autoEmitOnPayment?: boolean,
): Promise<SriPublicStatus> {
  return updateSriBillingFields({
    environment,
    ...(autoEmitOnPayment !== undefined ? { enabled: autoEmitOnPayment } : {}),
  });
}

export async function updateSriAutoEmit(
  autoEmitOnPayment: boolean,
): Promise<SriPublicStatus> {
  return updateSriBillingFields({ enabled: autoEmitOnPayment });
}

export async function clearSriCertificate(): Promise<SriPublicStatus> {
  const current = await ensureSriRow();
  if (current.certificateRelativePath) {
    const prev = path.isAbsolute(current.certificateRelativePath)
      ? current.certificateRelativePath
      : path.join(process.cwd(), current.certificateRelativePath);
    await unlink(prev).catch(() => undefined);
  }

  const row = await prisma.sriBillingSettings.update({
    where: { id: 1 },
    data: {
      certificateFileName: null,
      certificateRelativePath: null,
      certificatePasswordEnc: null,
      certificateUploadedAt: null,
    },
  });

  return toPublic(row);
}

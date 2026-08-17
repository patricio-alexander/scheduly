import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/shared/utils/prisma";
import { encryptSecret } from "@/shared/utils/secret-crypto";

export type SriPublicStatus = {
  hasCertificate: boolean;
  certFileName: string | null;
  environment: "pruebas" | "produccion";
  autoEmitOnPayment: boolean;
  uploadedAt: string | null;
};

const SRI_DIR = path.join(process.cwd(), "storage", "sri");
const MAX_CERT_BYTES = 5 * 1024 * 1024;

function normalizeEnvironment(value: unknown): "pruebas" | "produccion" {
  return String(value ?? "").toLowerCase() === "produccion"
    ? "produccion"
    : "pruebas";
}

async function ensureRow() {
  return (
    (await prisma.sriSettings.findUnique({ where: { id: 1 } })) ??
    (await prisma.sriSettings.create({
      data: { id: 1, environment: "pruebas" },
    }))
  );
}

function toPublic(row: {
  certFileName: string | null;
  certStoragePath: string | null;
  environment: string;
  autoEmitOnPayment?: boolean | null;
  uploadedAt: Date | null;
}): SriPublicStatus {
  return {
    hasCertificate: Boolean(row.certStoragePath && row.certFileName),
    certFileName: row.certFileName,
    environment: normalizeEnvironment(row.environment),
    autoEmitOnPayment: row.autoEmitOnPayment ?? false,
    uploadedAt: row.uploadedAt ? row.uploadedAt.toISOString() : null,
  };
}

export async function getSriStatus(): Promise<SriPublicStatus> {
  const row = await ensureRow();
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
  const current = await ensureRow();

  if (current.certStoragePath) {
    const prev = path.isAbsolute(current.certStoragePath)
      ? current.certStoragePath
      : path.join(process.cwd(), current.certStoragePath);
    await unlink(prev).catch(() => undefined);
  }

  const ext = name.endsWith(".pfx") ? ".pfx" : ".p12";
  const filename = `firma-electronica${ext}`;
  const absolute = path.join(SRI_DIR, filename);
  const relative = path.join("storage", "sri", filename);
  const buffer = Buffer.from(await input.file.arrayBuffer());
  await writeFile(absolute, buffer, { mode: 0o600 });

  const row = await prisma.sriSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      certFileName: input.file.name,
      certStoragePath: relative,
      certPasswordEnc: encryptSecret(password),
      environment: normalizeEnvironment(input.environment),
      uploadedAt: new Date(),
    },
    update: {
      certFileName: input.file.name,
      certStoragePath: relative,
      certPasswordEnc: encryptSecret(password),
      environment: normalizeEnvironment(input.environment),
      uploadedAt: new Date(),
    },
  });

  return toPublic(row);
}

export async function updateSriEnvironment(
  environment: unknown,
  autoEmitOnPayment?: boolean,
): Promise<SriPublicStatus> {
  const row = await prisma.sriSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      environment: normalizeEnvironment(environment),
      autoEmitOnPayment: autoEmitOnPayment ?? false,
    },
    update: {
      environment: normalizeEnvironment(environment),
      ...(autoEmitOnPayment !== undefined ? { autoEmitOnPayment } : {}),
    },
  });
  return toPublic(row);
}

export async function updateSriAutoEmit(
  autoEmitOnPayment: boolean,
): Promise<SriPublicStatus> {
  const current = await ensureRow();
  const row = await prisma.sriSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      environment: current.environment,
      autoEmitOnPayment,
    },
    update: { autoEmitOnPayment },
  });
  return toPublic(row);
}

export async function clearSriCertificate(): Promise<SriPublicStatus> {
  const current = await ensureRow();
  if (current.certStoragePath) {
    const prev = path.isAbsolute(current.certStoragePath)
      ? current.certStoragePath
      : path.join(process.cwd(), current.certStoragePath);
    await unlink(prev).catch(() => undefined);
  }

  const row = await prisma.sriSettings.upsert({
    where: { id: 1 },
    create: { id: 1, environment: "pruebas" },
    update: {
      certFileName: null,
      certStoragePath: null,
      certPasswordEnc: null,
      uploadedAt: null,
    },
  });

  return toPublic(row);
}

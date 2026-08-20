import fs from "fs/promises";
import path from "path";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/utils/prisma";
import {
  BACKUP_TABLE_KEYS,
  backupTableDelegate,
  ensureBackupsDir,
  MAIN_BACKUP_PATH,
  BACKUPS_DIR,
  summarizeBackupData,
  type BackupTableKey,
  type DbClient,
} from "./export-database";
import {
  EDDELI_SKIPPED_TABLES,
  isEdDeliBackupPayload,
  remapEdDeliBackupToScheduly,
} from "./eddeli-map";

const EDDELI_SKIPPED = new Set<string>(EDDELI_SKIPPED_TABLES);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

type FieldKind = "boolean" | "string" | "number" | "other";

/** Tipos escalares leídos del schema.prisma (sin depender de DMMF). */
function loadFieldKindsFromSchema(): Map<string, FieldKind> {
  const map = new Map<string, FieldKind>();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsSync = require("fs") as typeof import("fs");
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    const text = fsSync.readFileSync(schemaPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("model ")) {
        continue;
      }
      const m = trimmed.match(
        /^(\w+)\s+(String|Boolean|Int|Float|Decimal|DateTime|Json)\b/,
      );
      if (!m) continue;
      const [, name, type] = m;
      if (map.has(name)) {
        // mismo nombre en varios modelos: priorizar string si algún modelo lo es
        const prev = map.get(name)!;
        if (prev === "string" || type === "String") map.set(name, "string");
        else if (type === "Boolean") map.set(name, "boolean");
        else if (type === "Int" || type === "Float" || type === "Decimal") {
          if (prev !== "string" && prev !== "boolean") map.set(name, "number");
        }
        continue;
      }
      if (type === "Boolean") map.set(name, "boolean");
      else if (type === "String") map.set(name, "string");
      else if (type === "Int" || type === "Float" || type === "Decimal") {
        map.set(name, "number");
      } else map.set(name, "other");
    }
  } catch {
    /* fallback vacío → sin coerción tipada */
  }
  return map;
}

const FIELD_KINDS = loadFieldKindsFromSchema();

type WritableDelegate = {
  deleteMany: (args?: object) => Promise<{ count: number }>;
  createMany: (args: {
    data: Record<string, unknown>[];
    skipDuplicates?: boolean;
  }) => Promise<{ count: number }>;
};

const modelFieldCache = new Map<string, Set<string>>();

function scalarFieldsForModel(modelName: string): Set<string> {
  let cached = modelFieldCache.get(modelName);
  if (cached) return cached;
  const enumKey = `${modelName}ScalarFieldEnum` as keyof typeof Prisma;
  const fieldEnum = Prisma[enumKey] as Record<string, string> | undefined;
  cached = new Set(fieldEnum ? Object.values(fieldEnum) : []);
  modelFieldCache.set(modelName, cached);
  return cached;
}

function deserializeValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;

  const kind = FIELD_KINDS.get(key);

  if (typeof value === "string") {
    if (ISO_DATE_RE.test(value) || DATE_ONLY_RE.test(value)) {
      const date = new Date(
        DATE_ONLY_RE.test(value) ? `${value}T12:00:00.000Z` : value,
      );
      return Number.isNaN(date.getTime()) ? value : date;
    }
    if (kind === "number" && NUMERIC_RE.test(value.trim())) {
      return Number(value);
    }
    if (kind === "boolean") {
      if (value === "1" || value.toLowerCase() === "true") return true;
      if (value === "0" || value.toLowerCase() === "false") return false;
    }
    return value;
  }

  if (typeof value === "number") {
    if (kind === "string") return String(value);
    if (kind === "boolean" && (value === 0 || value === 1)) return value === 1;
    return value;
  }

  if (typeof value === "boolean") {
    if (kind === "number") return value ? 1 : 0;
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deserializeValue(key, item));
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deserializeValue(k, v);
    }
    return out;
  }

  return value;
}

function deserializeRows(
  modelName: string,
  rows: unknown[],
): Record<string, unknown>[] {
  const allowed = scalarFieldsForModel(modelName);
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Cada fila del backup debe ser un objeto");
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      if (allowed.size > 0 && !allowed.has(key)) continue;
      out[key] = deserializeValue(key, value);
    }
    return out;
  });
}

/** AccountRoles de EdDeli a veces no traen `id`; genera ids secuenciales. */
function ensureAccountRoleIds(rows: unknown[]): unknown[] {
  let nextId = 1;
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const id = (row as Record<string, unknown>).id;
    if (typeof id === "number" && Number.isFinite(id) && id >= nextId) {
      nextId = id + 1;
    }
  }

  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const r = row as Record<string, unknown>;
    if (r.id === undefined || r.id === null) {
      return { ...r, id: nextId++ };
    }
    return row;
  });
}

function normalizeToSchedulyTables(
  source: Record<string, unknown>,
): Record<string, unknown[]> {
  if (isEdDeliBackupPayload(source)) {
    return remapEdDeliBackupToScheduly(source);
  }
  const out: Record<string, unknown[]> = {};
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) out[key] = value as unknown[];
  }
  return out;
}

export function parseBackupJson(raw: string): Record<BackupTableKey, unknown[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("El archivo no es JSON válido");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("El JSON debe ser un objeto con tablas");
  }

  const source = parsed as Record<string, unknown>;
  const isEdDeli = isEdDeliBackupPayload(source);

  if (isEdDeli) {
    for (const key of Object.keys(source)) {
      if (EDDELI_SKIPPED.has(key)) {
        console.warn(
          `[backups/import] Tabla EdDeli omitida (no soportada en Scheduly): ${key}`,
        );
      }
    }
  }

  const remapped = normalizeToSchedulyTables(source);
  const knownKeys = new Set<string>(BACKUP_TABLE_KEYS);

  const hasKnownTable = BACKUP_TABLE_KEYS.some(
    (key) =>
      Array.isArray(remapped[key]) && (remapped[key] as unknown[]).length > 0,
  );

  if (!hasKnownTable) {
    throw new Error(
      "No se encontraron tablas válidas de Scheduly/EdDeli en el JSON (Role, Person, Customer, Product, etc.)",
    );
  }

  const result = {} as Record<BackupTableKey, unknown[]>;
  for (const key of BACKUP_TABLE_KEYS) {
    const value = remapped[key];
    if (value === undefined) {
      result[key] = [];
      continue;
    }
    if (!Array.isArray(value)) {
      throw new Error(`La tabla "${key}" debe ser un array`);
    }
    result[key] =
      key === "AccountRole" ? ensureAccountRoleIds(value) : value;
  }

  for (const key of Object.keys(remapped)) {
    if (!knownKeys.has(key)) {
      console.warn(`[backups/import] Ignorando clave desconocida: ${key}`);
    }
  }

  return result;
}

function timestampSuffix(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
}

const CREATE_CHUNK = 500;

/** Borra todas las tablas del backup e inserta las filas del JSON. */
export async function restoreDatabaseFromBackup(
  data: Record<BackupTableKey, unknown[]>,
  options?: { savePayload?: string },
) {
  const summary = summarizeBackupData(data as Record<string, unknown[]>);

  await prisma.$transaction(
    async (tx) => {
      const db = tx as unknown as DbClient;

      await db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

      for (const key of [...BACKUP_TABLE_KEYS].reverse()) {
        const delegate = backupTableDelegate(
          db,
          key,
        ) as unknown as WritableDelegate;
        await delegate.deleteMany({});
      }

      for (const key of BACKUP_TABLE_KEYS) {
        const rows = data[key];
        if (!rows.length) continue;
        const delegate = backupTableDelegate(
          db,
          key,
        ) as unknown as WritableDelegate;
        const prepared = deserializeRows(key, rows);
        for (let i = 0; i < prepared.length; i += CREATE_CHUNK) {
          await delegate.createMany({
            data: prepared.slice(i, i + CREATE_CHUNK),
          });
        }
      }

      await db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    },
    { timeout: 600_000 },
  );

  if (options?.savePayload) {
    await ensureBackupsDir();
    const filename = `backup-scheduly-import-${timestampSuffix()}.json`;
    await fs.writeFile(
      path.join(BACKUPS_DIR, filename),
      options.savePayload,
      "utf8",
    );
    await fs.writeFile(MAIN_BACKUP_PATH, options.savePayload, "utf8");
  }

  return summary;
}

export async function importBackupFromJson(raw: string) {
  const data = parseBackupJson(raw);
  return restoreDatabaseFromBackup(data, { savePayload: raw });
}

/** Restaura desde el backup.json fijo del servidor. */
export async function reloadFromMainBackup() {
  const raw = await fs.readFile(MAIN_BACKUP_PATH, "utf8");
  const data = parseBackupJson(raw);
  return restoreDatabaseFromBackup(data);
}

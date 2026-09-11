/**
 * 1) Backup JSON de la BD
 * 2) Vacía todas las tablas (TRUNCATE)
 * 3) Deja solo roles de sistema + cuenta Programador (administrador)
 *
 * Uso: npm run db:wipe-programmer
 *
 * Nota: no importa export-database (Prisma de Next vía @/) — eso
 * alargaba el reset desde el simulador varios minutos.
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../generated/prisma-runtime/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { BACKUP_TABLE_KEYS } from "../src/features/backups/lib/backup-table-keys";
import { hashPassword } from "../shared/utils/password";
import { SYSTEM_ROLES } from "../shared/utils/system-roles";
import { AG_PROGRAMMER } from "./lib/andrea-guerrero-demo";

const SCHEDULY_BACKUPS = path.join(process.cwd(), "backups");
const SIM_BACKUPS = path.join(process.cwd(), "..", "simulador", "data", "backups");

/** Tablas enormes: tope de filas en el backup pre-wipe (sigue siendo recuperable). */
const BACKUP_ROW_CAP: Record<string, number> = {
  SystemLog: 200,
  Notification: 200,
  NotificationDispatchLog: 100,
};

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  );
}

function camelKey(key: string) {
  return key.charAt(0).toLowerCase() + key.slice(1);
}

type Delegate = {
  findMany: (args?: object) => Promise<unknown[]>;
};

function summarize(data: Record<string, unknown[]>) {
  const counts: Record<string, number> = {};
  let totalRows = 0;
  for (const [key, rows] of Object.entries(data)) {
    const n = Array.isArray(rows) ? rows.length : 0;
    counts[key] = n;
    totalRows += n;
  }
  return { counts, totalRows };
}

async function dumpFast(prisma: PrismaClient) {
  const data: Record<string, unknown[]> = {};
  for (const key of BACKUP_TABLE_KEYS) {
    const camel = camelKey(key);
    const delegate = (prisma as unknown as Record<string, Delegate | undefined>)[
      camel
    ];
    if (!delegate?.findMany) {
      data[key] = [];
      console.log(`  backup skip: ${key}`);
      continue;
    }
    const cap = BACKUP_ROW_CAP[key];
    let rows: unknown[];
    try {
      rows = await delegate.findMany(
        cap ? { take: cap, orderBy: { id: "desc" } } : undefined,
      );
    } catch {
      rows = await delegate.findMany(cap ? { take: cap } : undefined);
    }
    data[key] = rows;
    if (rows.length) console.log(`  backup: ${key} (${rows.length})`);
  }
  return data;
}

async function wipeAll(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    const tables = [
      "AccountBranch",
      ...[...BACKUP_TABLE_KEYS].reverse(),
    ];
    const seen = new Set<string>();
    for (const table of tables) {
      if (seen.has(table)) continue;
      seen.add(table);
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
        console.log(`  vaciado: ${table}`);
      } catch {
        // Fallback si la tabla no existe o TRUNCATE falla
        const camel = camelKey(table);
        const delegate = (
          prisma as unknown as Record<
            string,
            { deleteMany?: (args?: object) => Promise<unknown> } | undefined
          >
        )[camel];
        if (delegate?.deleteMany) {
          await delegate.deleteMany({});
          console.log(`  vaciado: ${table}`);
        } else {
          console.warn(`  (skip) ${table}`);
        }
      }
    }
  } finally {
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
}

async function saveJsonBackup(prisma: PrismaClient) {
  const data = await dumpFast(prisma);
  const payload = JSON.stringify({
    meta: {
      app: "scheduly",
      kind: "pre-wipe-programmer",
      createdAt: new Date().toISOString(),
      note: "Backup antes de wipe → solo Programador (administrador)",
    },
    ...data,
  });
  const filename = `backup-pre-wipe-programmer-${stamp()}.json`;
  await fs.mkdir(SCHEDULY_BACKUPS, { recursive: true });
  await fs.mkdir(SIM_BACKUPS, { recursive: true });
  const schedulyPath = path.join(SCHEDULY_BACKUPS, filename);
  const simPath = path.join(SIM_BACKUPS, filename);
  const mainScheduly = path.join(SCHEDULY_BACKUPS, "backup.json");
  const mainSim = path.join(SIM_BACKUPS, "backup-latest.json");
  await fs.writeFile(schedulyPath, payload, "utf8");
  await fs.copyFile(schedulyPath, simPath);
  await fs.copyFile(schedulyPath, mainScheduly);
  await fs.copyFile(schedulyPath, mainSim);
  const summary = summarize(data);
  return {
    filename,
    schedulyPath,
    simPath,
    sizeBytes: Buffer.byteLength(payload, "utf8"),
    ...summary,
  };
}

async function seedProgrammerOnly(prisma: PrismaClient) {
  for (const role of SYSTEM_ROLES) {
    await prisma.role.create({ data: { name: role.name } });
  }
  console.log("  roles: Dueño, Administrador, Empleado, Programador");

  const progRole = await prisma.role.findFirst({
    where: { name: "Programador" },
  });
  if (!progRole) throw new Error("No se creó rol Programador");

  const passwordHash = await hashPassword(AG_PROGRAMMER.password);
  const person = await prisma.person.create({
    data: {
      firstName: AG_PROGRAMMER.firstName,
      firstLastName: AG_PROGRAMMER.firstLastName,
      documentType: "05",
    },
  });
  await prisma.personData.create({
    data: {
      idUser: person.id,
      personalEmail: AG_PROGRAMMER.email,
      cellPhone: AG_PROGRAMMER.phone,
      placeResidence: "Loja, Ecuador",
    },
  });
  const account = await prisma.account.create({
    data: {
      username: AG_PROGRAMMER.username,
      password: passwordHash,
      userId: person.id,
      isActive: true,
    },
  });
  await prisma.accountRole.create({
    data: { accountId: account.id, roleId: progRole.id },
  });

  await prisma.appSettings.create({
    data: {
      id: 1,
      name: "Scheduly · sim desde cero",
      alias: "scheduly-sim",
      description: "BD limpia · solo Programador. Armá el negocio con los bots.",
      phone: AG_PROGRAMMER.phone,
      accentColor: "#D4AF37",
      successColor: "#22C55E",
      warningColor: "#F0B429",
      dangerColor: "#F04438",
    },
  });

  console.log(
    `  cuenta: ${AG_PROGRAMMER.username} / ${AG_PROGRAMMER.password} (Programador)`,
  );
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Falta DATABASE_URL");

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
  try {
    console.log("1) Backup JSON de la BD actual…");
    const backup = await saveJsonBackup(prisma);
    console.log(`  → ${backup.schedulyPath}`);
    console.log(`  → backup-pre-wipe-programmer (ok)`);
    console.log(
      `  filas: ${backup.totalRows} · ${(backup.sizeBytes / 1024).toFixed(1)} KB`,
    );

    console.log("2) Wipe total…");
    await wipeAll(prisma);
    console.log("3) Seed solo Programador…");
    await seedProgrammerOnly(prisma);
    console.log("");
    console.log("Listo. Simulá desde cero con:");
    console.log(`  ${AG_PROGRAMMER.username} / ${AG_PROGRAMMER.password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

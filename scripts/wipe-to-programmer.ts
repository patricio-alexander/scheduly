/**
 * 1) Backup completo de la BD → JSON (Scheduly/backups + simulador/data/backups)
 * 2) Vacía todas las tablas
 * 3) Deja solo roles de sistema + cuenta Programador (edgar)
 *
 * Uso: npm run db:wipe-programmer
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  BACKUP_TABLE_KEYS,
  dumpDatabaseToJson,
  summarizeBackupData,
} from "../src/features/backups/lib/export-database";
import { hashPassword } from "../shared/utils/password";
import { SYSTEM_ROLES } from "../shared/utils/system-roles";
import { AG_PROGRAMMER } from "./lib/andrea-guerrero-demo";

const SCHEDULY_BACKUPS = path.join(process.cwd(), "backups");
const SIM_BACKUPS = path.join(process.cwd(), "..", "simulador", "data", "backups");

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  );
}

async function wipeAll(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    try {
      await prisma.$executeRawUnsafe("DELETE FROM AccountBranch");
      console.log("  vaciado: AccountBranch");
    } catch {
      /* ok */
    }
    for (const key of [...BACKUP_TABLE_KEYS].reverse()) {
      const camel = key.charAt(0).toLowerCase() + key.slice(1);
      const delegate = (
        prisma as unknown as Record<
          string,
          { deleteMany: (args?: object) => Promise<unknown> }
        >
      )[camel];
      if (!delegate?.deleteMany) {
        console.warn(`  (skip) sin delegate: ${key}`);
        continue;
      }
      await delegate.deleteMany({});
      console.log(`  vaciado: ${key}`);
    }
  } finally {
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
}

async function saveJsonBackup() {
  const data = await dumpDatabaseToJson();
  const payload = JSON.stringify(
    {
      meta: {
        app: "scheduly",
        kind: "pre-wipe-programmer",
        createdAt: new Date().toISOString(),
        note: "Backup antes de wipe → solo Programador (edgar)",
      },
      ...data,
    },
    null,
    2,
  );
  const filename = `backup-pre-wipe-programmer-${stamp()}.json`;
  await fs.mkdir(SCHEDULY_BACKUPS, { recursive: true });
  await fs.mkdir(SIM_BACKUPS, { recursive: true });
  const schedulyPath = path.join(SCHEDULY_BACKUPS, filename);
  const simPath = path.join(SIM_BACKUPS, filename);
  const mainScheduly = path.join(SCHEDULY_BACKUPS, "backup.json");
  const mainSim = path.join(SIM_BACKUPS, "backup-latest.json");
  await fs.writeFile(schedulyPath, payload, "utf8");
  await fs.writeFile(simPath, payload, "utf8");
  await fs.writeFile(mainScheduly, payload, "utf8");
  await fs.writeFile(mainSim, payload, "utf8");
  const summary = summarizeBackupData(data);
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

  console.log("1) Backup JSON de la BD actual…");
  const backup = await saveJsonBackup();
  console.log(`  → ${backup.schedulyPath}`);
  console.log(`  → ${backup.simPath}`);
  console.log(`  filas: ${backup.totalRows} · ${(backup.sizeBytes / 1024).toFixed(1)} KB`);

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
  try {
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

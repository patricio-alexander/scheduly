/**
 * Recrea tablas si hace falta e importa backup EdDeli → Scheduly.
 * Uso: npx tsx scripts/import-eddeli-backup.ts [ruta-al-json]
 */
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { importBackupFromJson } from "../src/features/backups/lib/import-database";
import { prisma } from "../shared/utils/prisma";
import { hashPassword } from "../shared/utils/password";

const DEFAULT_BACKUP = path.resolve(
  process.cwd(),
  "../eddeli/backend/src/database/backup.json",
);

async function ensureOwnerLogin() {
  const password = await hashPassword("admin123");
  const account =
    (await prisma.account.findFirst({ where: { username: "administrador" } })) ??
    (await prisma.account.findFirst({ where: { username: "admin" } })) ??
    (await prisma.account.findFirst({ orderBy: { id: "asc" } }));

  if (!account) {
    console.warn("No hay Account tras import; corre seed-minimal.");
    return;
  }

  await prisma.account.update({
    where: { id: account.id },
    data: { password, isActive: true },
  });

  // Asegurar rol owner para login Dueño en Scheduly
  let owner = await prisma.role.findFirst({ where: { name: "owner" } });
  if (!owner) {
    owner = await prisma.role.create({ data: { name: "owner" } });
  }
  const link = await prisma.accountRole.findFirst({
    where: { accountId: account.id, roleId: owner.id },
  });
  if (!link) {
    await prisma.accountRole.create({
      data: { accountId: account.id, roleId: owner.id },
    });
  }

  console.log(
    `Login de prueba: ${account.username} / admin123 (rol owner añadido)`,
  );

  await prisma.loyaltySettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

async function main() {
  const file = path.resolve(process.argv[2] || DEFAULT_BACKUP);
  console.log("Leyendo", file);
  const raw = await fs.readFile(file, "utf8");
  console.log("Importando…");
  const summary = await importBackupFromJson(raw);
  console.log("Import OK", summary);
  await ensureOwnerLogin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

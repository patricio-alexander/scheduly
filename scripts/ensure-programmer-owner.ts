/**
 * Asegura rol Programador + cuentas andrea (Dueña) y administrador (Programador)
 * sin vaciar la BD. Útil si no querés correr db:reset completo.
 *
 * Uso: npx tsx scripts/ensure-programmer-owner.ts
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma-runtime/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "../shared/utils/password";
import {
  AG_OWNER,
  AG_PASSWORD,
  AG_PROGRAMMER,
} from "./lib/andrea-guerrero-demo";

async function upsertAccount(
  prisma: PrismaClient,
  opts: {
    username: string;
    password: string;
    firstName: string;
    firstLastName: string;
    email: string;
    phone: string;
    roleName: string;
    alsoRoles?: string[];
  },
) {
  const role = await prisma.role.findFirst({ where: { name: opts.roleName } });
  if (!role) throw new Error(`Falta rol ${opts.roleName}`);

  const passwordHash = await hashPassword(opts.password);
  let account = await prisma.account.findFirst({
    where: { username: opts.username },
    include: { roles: true },
  });

  if (!account) {
    // Migrar legacy Administrador → andrea
    if (opts.username === AG_OWNER.username) {
      const legacy = await prisma.account.findFirst({
        where: { username: "Administrador" },
        include: { person: true, roles: true },
      });
      if (legacy) {
        await prisma.account.update({
          where: { id: legacy.id },
          data: {
            username: AG_OWNER.username,
            password: passwordHash,
          },
        });
        account = await prisma.account.findUniqueOrThrow({
          where: { id: legacy.id },
          include: { roles: true },
        });
        console.log(`  migrado Administrador → ${AG_OWNER.username}`);
      }
    }
  }

  if (!account) {
    const person = await prisma.person.create({
      data: {
        firstName: opts.firstName,
        firstLastName: opts.firstLastName,
        documentType: "05",
      },
    });
    await prisma.personData.create({
      data: {
        idUser: person.id,
        personalEmail: opts.email,
        cellPhone: opts.phone,
      },
    });
    account = await prisma.account.create({
      data: {
        username: opts.username,
        password: passwordHash,
        userId: person.id,
        isActive: true,
      },
      include: { roles: true },
    });
    console.log(`  creado ${opts.username}`);
  } else {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: passwordHash, isActive: true },
    });
    console.log(`  actualizado ${opts.username}`);
  }

  const roleIds = new Set<number>([role.id]);
  for (const name of opts.alsoRoles ?? []) {
    const r = await prisma.role.findFirst({ where: { name } });
    if (r) roleIds.add(r.id);
  }

  for (const roleId of roleIds) {
    const exists = await prisma.accountRole.findFirst({
      where: { accountId: account.id, roleId },
    });
    if (!exists) {
      await prisma.accountRole.create({
        data: { accountId: account.id, roleId },
      });
    }
  }

  // Programador: quitar roles de negocio si los tuviera
  if (opts.roleName === "Programador") {
    const allRoles = await prisma.accountRole.findMany({
      where: { accountId: account.id },
      include: { role: true },
    });
    for (const link of allRoles) {
      if (link.role.name !== "Programador") {
        await prisma.accountRole.deleteMany({
          where: { accountId: account.id, roleId: link.roleId },
        });
      }
    }
  }
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Falta DATABASE_URL");
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(url),
  });
  try {
    for (const name of [
      "Dueño",
      "Administrador",
      "Empleado",
      "Programador",
    ]) {
      const existing = await prisma.role.findFirst({ where: { name } });
      if (!existing) await prisma.role.create({ data: { name } });
    }
    console.log("Roles OK (Dueño, Administrador, Empleado, Programador)");

    await upsertAccount(prisma, {
      username: AG_OWNER.username,
      password: AG_OWNER.password,
      firstName: AG_OWNER.firstName,
      firstLastName: AG_OWNER.firstLastName,
      email: AG_OWNER.email,
      phone: AG_OWNER.phone,
      roleName: "Dueño",
      alsoRoles: ["Administrador", "Empleado"],
    });

    await upsertAccount(prisma, {
      username: AG_PROGRAMMER.username,
      password: AG_PROGRAMMER.password,
      firstName: AG_PROGRAMMER.firstName,
      firstLastName: AG_PROGRAMMER.firstLastName,
      email: AG_PROGRAMMER.email,
      phone: AG_PROGRAMMER.phone,
      roleName: "Programador",
    });

    console.log("");
    console.log("Credenciales:");
    console.log(`  Dueña:        ${AG_OWNER.username} / ${AG_OWNER.password}`);
    console.log(
      `  Programador:  ${AG_PROGRAMMER.username} / ${AG_PROGRAMMER.password}`,
    );
    console.log(`  Admins/emp:   * / ${AG_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

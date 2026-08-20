/**
 * Seed mínimo post-migración schema EdDeli-aligned.
 * Tras importar backup EdDeli no hace falta; útil en BD vacía.
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "../shared/utils/password";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Falta DATABASE_URL");

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(url),
  });

  try {
    const roles = ["owner", "admin", "employee", "Programador", "Administrador", "Empleado"];
    for (const name of roles) {
      const existing = await prisma.role.findFirst({ where: { name } });
      if (!existing) await prisma.role.create({ data: { name } });
    }

    let person = await prisma.person.findFirst({
      where: { firstName: "Dueño", firstLastName: "Scheduly" },
    });
    if (!person) {
      person = await prisma.person.create({
        data: {
          firstName: "Dueño",
          firstLastName: "Scheduly",
          documentType: "05",
        },
      });
    }

    await prisma.personData.upsert({
      where: { idUser: person.id },
      create: {
        idUser: person.id,
        personalEmail: "dueno@scheduly.local",
        cellPhone: "",
      },
      update: {},
    });

    const password = await hashPassword("admin123");
    let account = await prisma.account.findFirst({
      where: { username: "admin" },
    });
    if (!account) {
      account = await prisma.account.create({
        data: {
          username: "admin",
          password,
          userId: person.id,
          isActive: true,
        },
      });
    } else {
      await prisma.account.update({
        where: { id: account.id },
        data: { password, userId: person.id, isActive: true },
      });
    }

    const ownerRole = await prisma.role.findFirst({ where: { name: "owner" } });
    if (ownerRole) {
      const link = await prisma.accountRole.findFirst({
        where: { accountId: account.id, roleId: ownerRole.id },
      });
      if (!link) {
        await prisma.accountRole.create({
          data: { accountId: account.id, roleId: ownerRole.id },
        });
      }
    }

    await prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        name: "Scheduly",
        alias: "scheduly",
        accentColor: "#D4AF37",
      },
      update: {},
    });

    await prisma.appEntitlement.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        payload: { modules: [] },
        source: "gestor_push",
      },
      update: {},
    });

    await prisma.sriBillingSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });

    await prisma.loyaltySettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });

    console.log("Seed OK — login: admin / admin123");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

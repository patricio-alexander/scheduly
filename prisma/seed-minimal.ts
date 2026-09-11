/**
 * Seed mínimo: roles + cuenta Administrador.
 * Preferir `npm run db:reset` para vaciar y bootstrap completo.
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma-runtime/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "../shared/utils/password";
import { SYSTEM_ROLES } from "../shared/utils/system-roles";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Falta DATABASE_URL");

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(url),
  });

  try {
    for (const role of SYSTEM_ROLES) {
      const existing = await prisma.role.findFirst({ where: { name: role.name } });
      if (!existing) await prisma.role.create({ data: { name: role.name } });
    }

    let person = await prisma.person.findFirst({
      where: { firstName: "Andrea", firstLastName: "Guerrero" },
    });
    if (!person) {
      person = await prisma.person.create({
        data: {
          firstName: "Andrea",
          firstLastName: "Guerrero",
          documentType: "05",
        },
      });
    }

    await prisma.personData.upsert({
      where: { idUser: person.id },
      create: {
        idUser: person.id,
        personalEmail: "andrea@andreaguerrero.ec",
        cellPhone: "0994960155",
      },
      update: {},
    });

    const password = await hashPassword("12345678");
    let account = await prisma.account.findFirst({
      where: { username: "Administrador" },
    });
    if (!account) {
      account = await prisma.account.create({
        data: {
          username: "Administrador",
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

    const ownerRole = await prisma.role.findFirst({ where: { name: "Dueño" } });
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
        name: "Andrea Guerrero Estética y Peluquería",
        alias: "andrea-guerrero",
        phone: "0994960155",
        accentColor: "#D4AF37",
      },
      update: {
        name: "Andrea Guerrero Estética y Peluquería",
        phone: "0994960155",
        accentColor: "#D4AF37",
      },
    });

    console.log("Seed OK — login: Administrador / 12345678");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

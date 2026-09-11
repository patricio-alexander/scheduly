import "dotenv/config";
import { PrismaClient } from "../generated/prisma-runtime/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "../shared/utils/password";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await hashPassword("12345678");
  const user = await prisma.user.upsert({
    where: { username: "administrador" },
    update: {
      password,
      name: "Administrador",
      email: "administrador@scheduly.local",
      role: "owner",
      phone: "0999999999",
      bio: "Usuario administrador local",
    },
    create: {
      username: "administrador",
      name: "Administrador",
      email: "administrador@scheduly.local",
      password,
      role: "owner",
      phone: "0999999999",
      bio: "Usuario administrador local",
    },
  });

  let role = await prisma.role.findFirst({ where: { name: "owner" } });
  if (!role) role = await prisma.role.create({ data: { name: "owner" } });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  const branch = await prisma.branch.findFirst({ orderBy: { id: "asc" } });
  if (branch) {
    await prisma.userBranch.upsert({
      where: { userId_branchId: { userId: user.id, branchId: branch.id } },
      update: { isPrimary: true },
      create: { userId: user.id, branchId: branch.id, isPrimary: true },
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        id: user.id,
        username: user.username,
        role: user.role,
        branch: branch?.name || null,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

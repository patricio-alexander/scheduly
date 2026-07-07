import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/** Incrementar al cambiar el schema de Prisma para invalidar el singleton en dev */
const CLIENT_VERSION = "20260707-status";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaVersion?: string;
};

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

function createPrismaClient() {
  return new PrismaClient({ adapter });
}

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaVersion !== CLIENT_VERSION
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prismaVersion === CLIENT_VERSION && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : createPrismaClient();

globalForPrisma.prisma = prisma;
globalForPrisma.prismaVersion = CLIENT_VERSION;

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/** Incrementar al cambiar el schema de Prisma para invalidar el singleton en dev */
const CLIENT_VERSION = "20260707-stock-payment-v1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaVersion?: string;
};

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

function createPrismaClient() {
  return new PrismaClient({ adapter });
}

function isClientUpToDate(client?: PrismaClient): boolean {
  if (!client) return false;
  if (globalForPrisma.prismaVersion !== CLIENT_VERSION) return false;
  // Verifica que modelos nuevos existan (evita singleton obsoleto en hot reload)
  return typeof client.product?.findMany === "function" && typeof client.payment?.create === "function";
}

if (globalForPrisma.prisma && !isClientUpToDate(globalForPrisma.prisma)) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaVersion = undefined;
}

export const prisma = isClientUpToDate(globalForPrisma.prisma)
  ? globalForPrisma.prisma!
  : createPrismaClient();

globalForPrisma.prisma = prisma;
globalForPrisma.prismaVersion = CLIENT_VERSION;

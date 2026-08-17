import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const CLIENT_VERSION = "20260813190000-single-tenant-v1";

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
  return (
    typeof client.product?.findMany === "function" &&
    typeof client.payment?.create === "function" &&
    typeof client.category?.findMany === "function" &&
    typeof client.entitlement?.findMany === "function" &&
    typeof client.task?.findMany === "function" &&
    typeof client.businessSettings?.findUnique === "function" &&
    typeof client.branch?.findMany === "function" &&
    typeof client.purchase?.findMany === "function" &&
    typeof client.productSale?.findMany === "function"
  );
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

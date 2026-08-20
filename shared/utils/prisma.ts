import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const CLIENT_VERSION = "20260820150000-eddeli-aligned-v1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaVersion?: string;
};

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    "Falta DATABASE_URL. Creá AppsWeb/scheduly/.env (mirá .env.example).",
  );
}

const adapter = new PrismaMariaDb(databaseUrl);

function createPrismaClient() {
  return new PrismaClient({ adapter });
}

function isClientUpToDate(client?: PrismaClient): boolean {
  if (!client) return false;
  if (globalForPrisma.prismaVersion !== CLIENT_VERSION) return false;
  return (
    typeof client.account?.findFirst === "function" &&
    typeof client.person?.findMany === "function" &&
    typeof client.product?.findMany === "function" &&
    typeof client.sale?.findMany === "function" &&
    typeof client.purchaseOrder?.findMany === "function" &&
    typeof client.appSettings?.findUnique === "function" &&
    typeof client.branch?.findMany === "function" &&
    typeof client.financePayment?.findMany === "function"
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

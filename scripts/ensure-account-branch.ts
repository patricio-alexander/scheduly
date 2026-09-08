import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { ensureAccountBranchTable } from "../shared/utils/account-branch";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
  });
  try {
    await ensureAccountBranchTable(prisma);
    console.log("AccountBranch lista");
  } finally {
    await prisma.$disconnect();
  }
}

main();

import "dotenv/config";
import { PrismaClient } from "../generated/prisma-runtime/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { DEFAULT_PAYMENT_MEDIA } from "../shared/utils/payment-media";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
  });
  console.log("paymentMedium delegate:", typeof prisma.paymentMedium);
  let n = await prisma.paymentMedium.count();
  console.log("count:", n);
  if (n === 0) {
    await prisma.paymentMedium.createMany({
      data: DEFAULT_PAYMENT_MEDIA.map((m) => ({
        name: m.name,
        code: m.code,
        kind: m.kind,
        position: m.position,
        isActive: true,
      })),
    });
    n = await prisma.paymentMedium.count();
    console.log("seeded defaults:", n);
  }
  const rows = await prisma.paymentMedium.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  console.log(rows.map((r) => `${r.id}:${r.name}`).join(" | "));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

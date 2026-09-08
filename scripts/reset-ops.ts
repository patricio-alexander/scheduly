/**
 * Reset operativo · conserva catálogo y gente.
 *
 * SE CONSERVA:
 *  - Roles, personas, cuentas, vínculos a locales
 *  - Clientes, productos, servicios, categorías
 *  - Sucursales (reales), cajas, stock por local (se rellena)
 *  - Proveedores, settings, premios/loyalty config
 *
 * SE BORRA (movimientos / ingresos / operación):
 *  - Citas y cobros, ventas POS, turnos de caja
 *  - Ingresos/gastos ledger, comisiones, facturas
 *  - Notificaciones, movimientos de stock, compras, etc.
 *
 * Uso:
 *   npx tsx scripts/reset-ops.ts
 *   o menú → Utilidades → Reset operativo (sin ingresos)
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const DEMO_BRANCH_STOCK = 80;

/** Hijos → padres (orden de borrado). */
const WIPE_MODELS = [
  "AppointmentPayment",
  "AppointmentProduct",
  "AppointmentService",
  "Appointment",
  "SalePaymentInstallment",
  "SaleLine",
  "Sale",
  "CashShiftMovement",
  "CashShift",
  "Income",
  "Expense",
  "CommissionRecord",
  "ElectronicInvoice",
  "ItemGroupItem",
  "FinancePayment",
  "ItemGroup",
  "PurchaseOrderPaymentInstallment",
  "PurchaseOrderLine",
  "PurchaseOrder",
  "SupplierOrderPayment",
  "SupplierPackItem",
  "SupplierPack",
  "ObligationPayment",
  "FinancialObligation",
  "DocumentAttachment",
  "TaskItem",
  "TaskPlan",
  "StockMovement",
  "Batch",
  "RecurringExpenseOccurrence",
  "PointTransaction",
  "CustomerLoyalty",
  "NotificationDispatchLog",
  "Notification",
  "FeedPost",
  "SystemLog",
] as const;

async function wipeOps(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const key of WIPE_MODELS) {
      const camel = key.charAt(0).toLowerCase() + key.slice(1);
      const delegate = (
        prisma as unknown as Record<
          string,
          { deleteMany: (args?: object) => Promise<{ count: number }> }
        >
      )[camel];
      if (!delegate?.deleteMany) {
        console.warn(`  (skip) sin delegate: ${key}`);
        continue;
      }
      const result = await delegate.deleteMany({});
      console.log(`  vaciado: ${key} (${result.count})`);
    }

    // Locales de tours de prueba (no los demo Colón / Eguiguren)
    try {
      const tourBranches = await prisma.branch.findMany({
        where: { name: { contains: "Tour" } },
        select: { id: true, name: true },
      });
      for (const b of tourBranches) {
        await prisma.branchStock.deleteMany({ where: { storeId: b.id } });
        await prisma.branchProduct.deleteMany({ where: { storeId: b.id } });
        await prisma.cashRegister.deleteMany({ where: { storeId: b.id } });
        await prisma.accountBranch.deleteMany({ where: { branchId: b.id } });
        await prisma.serviceBranch.deleteMany({ where: { branchId: b.id } });
        await prisma.branch.delete({ where: { id: b.id } });
        console.log(`  borrado local tour: ${b.name}`);
      }
    } catch (err) {
      console.warn(
        `  (skip) limpieza tours: ${err instanceof Error ? err.message : err}`,
      );
    }
  } finally {
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
}

async function restock(prisma: PrismaClient) {
  const branches = await prisma.branch.findMany({ select: { id: true } });
  const products = await prisma.product.findMany({ select: { id: true } });
  for (const branch of branches) {
    for (const product of products) {
      await prisma.branchStock.upsert({
        where: {
          storeId_productId: {
            storeId: branch.id,
            productId: product.id,
          },
        },
        create: {
          storeId: branch.id,
          productId: product.id,
          quantity: DEMO_BRANCH_STOCK,
        },
        update: { quantity: DEMO_BRANCH_STOCK },
      });
      await prisma.branchProduct.upsert({
        where: {
          storeId_productId: {
            storeId: branch.id,
            productId: product.id,
          },
        },
        create: {
          storeId: branch.id,
          productId: product.id,
          isActive: true,
        },
        update: { isActive: true },
      });
    }
  }
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: DEMO_BRANCH_STOCK * Math.max(branches.length, 1) },
    });
  }
  console.log(
    `  stock: ${products.length} productos × ${branches.length} locales = ${DEMO_BRANCH_STOCK}`,
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Falta DATABASE_URL en .env");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
  });

  console.log("");
  console.log("Reset operativo · se conservan clientes / productos / servicios / empleados");
  console.log("Se borran citas, ventas, cajas, ingresos, gastos, comisiones…");
  console.log("");

  try {
    await wipeOps(prisma);
    await restock(prisma);

    const [customers, products, services, accounts, appointments, sales, shifts] =
      await Promise.all([
        prisma.customer.count(),
        prisma.product.count(),
        prisma.service.count(),
        prisma.account.count(),
        prisma.appointment.count(),
        prisma.sale.count(),
        prisma.cashShift.count(),
      ]);

    console.log("");
    console.log("Estado:");
    console.log(`  clientes=${customers} · productos=${products} · servicios=${services} · cuentas=${accounts}`);
    console.log(`  citas=${appointments} · ventas=${sales} · turnos=${shifts}  (deben ser 0)`);
    console.log("");
    console.log("Listo. Podés correr la simulación última semana (hoy−7 → hoy).");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

/**
 * Vacía todas las tablas de Scheduly y deja demo Andrea Guerrero (Loja):
 * - Roles: Dueño, Administrador, Empleado, Programador
 * - Dueña: andrea / Andrea2026
 * - Programador: edgar / 12345678 (solo logs + tester live)
 * - Encargadas (Administrador) + equipo (Empleado) · 12345678
 * - 2 locales, cajas, servicios, productos, clientes, proveedores
 *
 * Uso: npm run db:reset
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { BACKUP_TABLE_KEYS } from "../src/features/backups/lib/export-database";
import { hashPassword } from "../shared/utils/password";
import { SYSTEM_ROLES } from "../shared/utils/system-roles";
import {
  AG_ADMINS,
  AG_BRANCHES,
  AG_BUSINESS,
  AG_CATEGORIES,
  AG_CUSTOMERS,
  AG_EMPLOYEES,
  AG_OWNER,
  AG_PASSWORD,
  AG_PRODUCTS,
  AG_PROGRAMMER,
  AG_SERVICES,
  AG_SUPPLIERS,
} from "./lib/andrea-guerrero-demo";
import {
  ensureAccountBranchTable,
  setAccountPrimaryBranch,
} from "../shared/utils/account-branch";


async function wipeAll(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    // Tabla de vínculo cuenta↔local (puede no estar en el client generado)
    try {
      await prisma.$executeRawUnsafe("DELETE FROM AccountBranch");
      console.log("  vaciado: AccountBranch");
    } catch {
      /* tabla aún no existe */
    }
    for (const key of [...BACKUP_TABLE_KEYS].reverse()) {
      const camel = key.charAt(0).toLowerCase() + key.slice(1);
      const delegate = (
        prisma as unknown as Record<
          string,
          { deleteMany: (args?: object) => Promise<unknown> }
        >
      )[camel];
      if (!delegate?.deleteMany) {
        console.warn(`  (skip) sin delegate: ${key}`);
        continue;
      }
      await delegate.deleteMany({});
      console.log(`  vaciado: ${key}`);
    }
  } finally {
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
}

async function createStaffAccount(
  prisma: PrismaClient,
  opts: {
    username: string;
    passwordHash: string;
    firstName: string;
    firstLastName: string;
    email: string;
    phone: string;
    roleId: number;
  },
) {
  const person = await prisma.person.create({
    data: {
      firstName: opts.firstName,
      firstLastName: opts.firstLastName,
      documentType: "05",
    },
  });

  await prisma.personData.create({
    data: {
      idUser: person.id,
      personalEmail: opts.email,
      cellPhone: opts.phone,
      placeResidence: "Loja, Ecuador",
    },
  });

  const account = await prisma.account.create({
    data: {
      username: opts.username,
      password: opts.passwordHash,
      userId: person.id,
      isActive: true,
    },
  });

  await prisma.accountRole.create({
    data: { accountId: account.id, roleId: opts.roleId },
  });

  return { person, account };
}

async function seedBootstrap(prisma: PrismaClient) {
  for (const role of SYSTEM_ROLES) {
    await prisma.role.create({ data: { name: role.name } });
  }
  console.log("  roles: Dueño, Administrador, Empleado, Programador");

  const ownerRole = await prisma.role.findFirst({ where: { name: "Dueño" } });
  const adminRole = await prisma.role.findFirst({
    where: { name: "Administrador" },
  });
  const employeeRole = await prisma.role.findFirst({
    where: { name: "Empleado" },
  });
  const programmerRole = await prisma.role.findFirst({
    where: { name: "Programador" },
  });
  if (!ownerRole || !adminRole || !employeeRole || !programmerRole) {
    throw new Error("No se crearon los roles del sistema");
  }

  const passwordHash = await hashPassword(AG_PASSWORD);
  const ownerPasswordHash = await hashPassword(AG_OWNER.password);

  // Dueña Andrea Guerrero
  const ownerPerson = await prisma.person.create({
    data: {
      firstName: AG_OWNER.firstName,
      firstLastName: AG_OWNER.firstLastName,
      documentType: "05",
    },
  });

  await prisma.personData.create({
    data: {
      idUser: ownerPerson.id,
      personalEmail: AG_OWNER.email,
      cellPhone: AG_OWNER.phone,
      placeResidence: "Loja, Ecuador",
    },
  });

  const ownerAccount = await prisma.account.create({
    data: {
      username: AG_OWNER.username,
      password: ownerPasswordHash,
      userId: ownerPerson.id,
      isActive: true,
    },
  });

  await prisma.accountRole.create({
    data: { accountId: ownerAccount.id, roleId: ownerRole.id },
  });
  // Dueña puede rotar a Administrador / Empleado en UI
  await prisma.accountRole.create({
    data: { accountId: ownerAccount.id, roleId: adminRole.id },
  });
  await prisma.accountRole.create({
    data: { accountId: ownerAccount.id, roleId: employeeRole.id },
  });
  console.log(`  dueña: ${AG_OWNER.username} / ${AG_OWNER.password}`);

  // Programador (Edgar) · solo observación
  const programmerCreated = await createStaffAccount(prisma, {
    username: AG_PROGRAMMER.username,
    passwordHash,
    firstName: AG_PROGRAMMER.firstName,
    firstLastName: AG_PROGRAMMER.firstLastName,
    email: AG_PROGRAMMER.email,
    phone: AG_PROGRAMMER.phone,
    roleId: programmerRole.id,
  });
  console.log(
    `  programador: ${AG_PROGRAMMER.username} / ${AG_PROGRAMMER.password}`,
  );
  void programmerCreated;

  // Locales primero (para vincular cuentas)
  await ensureAccountBranchTable(prisma);

  const branches: Array<{ id: number; key: string }> = [];
  for (const b of AG_BRANCHES) {
    const { key, ...data } = b;
    const row = await prisma.branch.create({
      data: {
        ...data,
        isActive: true,
        isVisible: true,
        createdBy: ownerAccount.id,
      },
    });
    branches.push({ id: row.id, key });

    await prisma.cashRegister.create({
      data: {
        storeId: row.id,
        name: `Caja ${row.name.includes("Colón") ? "Colón" : "Eguiguren"}`,
        code: key === "colon" ? "C01" : "C02",
        emissionPointCode: data.emissionPointCode,
        isActive: true,
        position: 1,
      },
    });
  }
  console.log(`  locales + cajas: ${branches.length}`);

  const branchByKey = Object.fromEntries(
    branches.map((b) => [b.key, b.id]),
  ) as Record<string, number>;
  const mainBranchId = branchByKey.colon ?? branches[0]?.id;

  // Dueña vinculada a matriz (ve todos; el vínculo es referencia)
  if (mainBranchId) {
    await setAccountPrimaryBranch(prisma, ownerAccount.id, mainBranchId);
  }

  for (const admin of AG_ADMINS) {
    const created = await createStaffAccount(prisma, {
      username: admin.username,
      passwordHash,
      firstName: admin.firstName,
      firstLastName: admin.firstLastName,
      email: admin.email,
      phone: admin.phone,
      roleId: adminRole.id,
    });
    const bid = branchByKey[admin.branchKey] ?? mainBranchId;
    if (bid) await setAccountPrimaryBranch(prisma, created.account.id, bid);
  }
  console.log(`  administradores: ${AG_ADMINS.length} (vinculados a su local)`);

  for (const [i, emp] of AG_EMPLOYEES.entries()) {
    const created = await createStaffAccount(prisma, {
      username: emp.username,
      passwordHash,
      firstName: emp.firstName,
      firstLastName: emp.firstLastName,
      email: emp.email,
      phone: emp.phone,
      roleId: employeeRole.id,
    });
    // Mitad en cada local
    const key = i % 2 === 0 ? "colon" : "eguiguren";
    const bid = branchByKey[key] ?? mainBranchId;
    if (bid) await setAccountPrimaryBranch(prisma, created.account.id, bid);
  }
  console.log(`  empleados: ${AG_EMPLOYEES.length} (repartidos en locales)`);

  await prisma.appSettings.create({
    data: {
      id: 1,
      name: AG_BUSINESS.name,
      alias: AG_BUSINESS.alias,
      description: AG_BUSINESS.description,
      phone: AG_BUSINESS.phone,
      socialWhatsapp: AG_BUSINESS.whatsapp,
      socialFacebook: AG_BUSINESS.facebook,
      socialInstagram: AG_BUSINESS.instagram,
      accentColor: AG_BUSINESS.accentColor,
      successColor: AG_BUSINESS.successColor,
      warningColor: AG_BUSINESS.warningColor,
      dangerColor: AG_BUSINESS.dangerColor,
    },
  });

  await prisma.sriBillingSettings.create({
    data: {
      id: 1,
      environment: "pruebas",
      tradeName: AG_BUSINESS.name,
      matrixAddress: AG_BUSINESS.matrixAddress,
      establishmentAddress: AG_BUSINESS.matrixAddress,
      phone: AG_BUSINESS.phone,
      email: AG_BUSINESS.email,
    },
  });

  await prisma.loyaltySettings.create({ data: { id: 1 } });

  // Servicios + vinculación a ambas sucursales
  for (const s of AG_SERVICES) {
    const service = await prisma.service.create({ data: { ...s } });
    for (const branch of branches) {
      await prisma.serviceBranch.create({
        data: {
          serviceId: service.id,
          branchId: branch.id,
          isActive: true,
        },
      });
    }
  }
  console.log(`  servicios: ${AG_SERVICES.length}`);

  const unit = await prisma.unit.create({
    data: {
      name: "Unidad",
      abbreviation: "u",
      description: "Unidad de venta",
      factor: 1,
    },
  });

  const categoryByName = new Map<string, number>();
  for (const cat of AG_CATEGORIES) {
    const row = await prisma.category.create({
      data: { name: cat.name, description: cat.description, isPublic: true },
    });
    categoryByName.set(cat.name, row.id);
  }
  console.log(`  categorías: ${AG_CATEGORIES.length}`);

  for (const [i, p] of AG_PRODUCTS.entries()) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        type: "final",
        unitId: unit.id,
        categoryId: categoryByName.get(p.category) ?? null,
        price: p.price,
        supplierPrice: p.cost,
        stock: p.stock,
        minStock: p.minStock,
        taxRate: 15,
        sku: `AG-${String(i + 1).padStart(4, "0")}`,
        isActive: true,
      },
    });

    for (const branch of branches) {
      // Stock repartido ~55% matriz / 45% sucursal
      const qty =
        branch.key === "colon"
          ? Math.ceil(p.stock * 0.55)
          : Math.floor(p.stock * 0.45);
      await prisma.branchStock.create({
        data: {
          storeId: branch.id,
          productId: product.id,
          quantity: qty,
        },
      });
      await prisma.branchProduct.create({
        data: {
          storeId: branch.id,
          productId: product.id,
          isActive: true,
        },
      });
    }
  }
  console.log(`  productos: ${AG_PRODUCTS.length}`);

  for (const c of AG_CUSTOMERS) {
    await prisma.customer.create({
      data: {
        name: c.name,
        firstName: c.firstName,
        firstLastName: c.firstLastName,
        secondLastName: c.secondLastName,
        phone: c.phone,
        email: c.email,
        address: "Loja, Ecuador",
        identType: "05",
        isActive: true,
      },
    });
  }
  console.log(`  clientes: ${AG_CUSTOMERS.length}`);

  for (const s of AG_SUPPLIERS) {
    await prisma.supplier.create({
      data: {
        name: s.name,
        phone: s.phone,
        email: s.email,
        identNumber: s.taxId,
        address: s.address,
        city: "Loja",
        province: "Loja",
        isActive: true,
      },
    });
  }
  console.log(`  proveedores: ${AG_SUPPLIERS.length}`);
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Falta DATABASE_URL");

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(url),
  });

  try {
    console.log("Scheduly · reset BD · Andrea Guerrero (Loja)");
    console.log("1) Vaciando tablas...");
    await wipeAll(prisma);
    console.log("2) Bootstrap + catálogo...");
    await seedBootstrap(prisma);
    console.log("");
    console.log("Listo.");
    console.log(`  Dueña: ${AG_OWNER.username} / ${AG_OWNER.password}`);
    console.log(
      `  Programador: ${AG_PROGRAMMER.username} / ${AG_PROGRAMMER.password}`,
    );
    console.log(`  Admins/empleados: * / ${AG_PASSWORD}`);
    console.log(
      `  Admins: ${AG_ADMINS.map((a) => a.username).join(", ")} / ${AG_PASSWORD}`,
    );
    console.log(
      `  Empleados: ${AG_EMPLOYEES.length} cuentas (ej. estilista_maria) / ${AG_PASSWORD}`,
    );
    console.log(
      `  Catálogo: ${AG_SERVICES.length} servicios · ${AG_PRODUCTS.length} productos · ${AG_CUSTOMERS.length} clientes`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

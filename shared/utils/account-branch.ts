/**
 * Persistencia Account ↔ Branch vía SQL (funciona aunque prisma generate falle).
 * Dueña: ve todos los locales.
 * Administrador: administra su local primario.
 * Empleado: trabaja en su local primario.
 */
import type { PrismaClient } from "@/generated/prisma/client";

export type AccountBranchRow = {
  id: number;
  accountId: number;
  branchId: number;
  isPrimary: boolean | number;
};

export type BranchRef = {
  id: number;
  name: string;
  code: string;
};

type Db = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe" | "branch">;

export async function ensureAccountBranchTable(db: Db) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AccountBranch (
      id INTEGER NOT NULL AUTO_INCREMENT,
      accountId INTEGER NOT NULL,
      branchId INTEGER NOT NULL,
      isPrimary BOOLEAN NOT NULL DEFAULT true,
      PRIMARY KEY (id),
      UNIQUE INDEX AccountBranch_accountId_branchId_key (accountId, branchId),
      INDEX AccountBranch_accountId_isPrimary_idx (accountId, isPrimary),
      INDEX AccountBranch_branchId_idx (branchId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

export async function getAccountPrimaryBranchId(
  db: Db,
  accountId: number,
): Promise<number | null> {
  const rows = await db.$queryRawUnsafe<Array<{ branchId: number }>>(
    `SELECT branchId FROM AccountBranch
     WHERE accountId = ? AND isPrimary = 1
     ORDER BY id ASC LIMIT 1`,
    accountId,
  );
  if (rows[0]?.branchId) return Number(rows[0].branchId);

  const any = await db.$queryRawUnsafe<Array<{ branchId: number }>>(
    `SELECT branchId FROM AccountBranch WHERE accountId = ? ORDER BY id ASC LIMIT 1`,
    accountId,
  );
  return any[0]?.branchId ? Number(any[0].branchId) : null;
}

export async function getAccountPrimaryBranch(
  db: Db,
  accountId: number,
): Promise<BranchRef | null> {
  const rows = await db.$queryRawUnsafe<
    Array<{ id: number; name: string; establishmentCode: string | null }>
  >(
    `SELECT b.id, b.name, b.establishmentCode
     FROM AccountBranch ab
     INNER JOIN Branch b ON b.id = ab.branchId
     WHERE ab.accountId = ?
     ORDER BY ab.isPrimary DESC, ab.id ASC
     LIMIT 1`,
    accountId,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.establishmentCode || `suc-${row.id}`,
  };
}

export async function setAccountPrimaryBranch(
  db: Db,
  accountId: number,
  branchId: number | null | undefined,
) {
  if (!branchId || !Number.isInteger(branchId) || branchId <= 0) return;

  await ensureAccountBranchTable(db);

  await db.$executeRawUnsafe(
    `UPDATE AccountBranch SET isPrimary = 0 WHERE accountId = ?`,
    accountId,
  );

  const existing = await db.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id FROM AccountBranch WHERE accountId = ? AND branchId = ? LIMIT 1`,
    accountId,
    branchId,
  );

  if (existing[0]?.id) {
    await db.$executeRawUnsafe(
      `UPDATE AccountBranch SET isPrimary = 1 WHERE id = ?`,
      existing[0].id,
    );
  } else {
    await db.$executeRawUnsafe(
      `INSERT INTO AccountBranch (accountId, branchId, isPrimary) VALUES (?, ?, 1)`,
      accountId,
      branchId,
    );
  }
}

export async function accountBelongsToBranch(
  db: Db,
  accountId: number,
  branchId: number | null,
): Promise<boolean> {
  if (branchId == null) return true;
  const rows = await db.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id FROM AccountBranch WHERE accountId = ? AND branchId = ? LIMIT 1`,
    accountId,
    branchId,
  );
  return Boolean(rows[0]?.id);
}

export async function listAccountsForBranch(db: Db, branchId: number) {
  return db.$queryRawUnsafe<
    Array<{
      accountId: number;
      personId: number | null;
      username: string | null;
      isActive: boolean | number;
      isPrimary: boolean | number;
      firstName: string | null;
      firstLastName: string | null;
      roleName: string | null;
    }>
  >(
    `SELECT
       a.id AS accountId,
       a.userId AS personId,
       a.username,
       a.isActive,
       ab.isPrimary,
       p.firstName,
       p.firstLastName,
       (
         SELECT r.name FROM AccountRole ar
         INNER JOIN Role r ON r.id = ar.roleId
         WHERE ar.accountId = a.id
         ORDER BY ar.id ASC LIMIT 1
       ) AS roleName
     FROM AccountBranch ab
     INNER JOIN Account a ON a.id = ab.accountId
     LEFT JOIN Person p ON p.id = a.userId
     WHERE ab.branchId = ?
     ORDER BY a.isActive DESC, a.username ASC`,
    branchId,
  );
}

export async function countAccountsByBranch(db: Db, branchId: number) {
  const rows = await db.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*) AS c FROM AccountBranch WHERE branchId = ?`,
    branchId,
  );
  return Number(rows[0]?.c ?? 0);
}

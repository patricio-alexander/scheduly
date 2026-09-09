/**
 * Persistencia Account ↔ Branch vía SQL (funciona aunque prisma generate falle).
 * Dueña: ve todos los locales.
 * Administrador: administra su local primario.
 * Empleado: trabaja en su local primario.
 * managerAccountId en Branch = encargado principal de ese local.
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

/** Columna Branch.managerAccountId (idempotente). */
export async function ensureBranchManagerColumn(db: Db) {
  try {
    const cols = await db.$queryRawUnsafe<Array<{ Field: string }>>(
      `SHOW COLUMNS FROM Branch LIKE 'managerAccountId'`,
    );
    if (cols.length) return;
    await db.$executeRawUnsafe(
      `ALTER TABLE Branch ADD COLUMN managerAccountId INTEGER NULL`,
    );
    try {
      await db.$executeRawUnsafe(
        `CREATE INDEX Branch_managerAccountId_idx ON Branch (managerAccountId)`,
      );
    } catch {
      /* índice ya existe */
    }
  } catch (e) {
    console.warn("ensureBranchManagerColumn", e);
  }
}

export async function getBranchManagerAccountId(
  db: Db,
  branchId: number,
): Promise<number | null> {
  await ensureBranchManagerColumn(db);
  const rows = await db.$queryRawUnsafe<Array<{ managerAccountId: number | null }>>(
    `SELECT managerAccountId FROM Branch WHERE id = ? LIMIT 1`,
    branchId,
  );
  const id = rows[0]?.managerAccountId;
  return id != null ? Number(id) : null;
}

export async function setBranchManagerAccountId(
  db: Db,
  branchId: number,
  accountId: number | null,
) {
  await ensureBranchManagerColumn(db);
  await db.$executeRawUnsafe(
    `UPDATE Branch SET managerAccountId = ? WHERE id = ?`,
    accountId,
    branchId,
  );
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

/** Vincula una cuenta a un local (sin quitar otros vínculos). */
export async function linkAccountToBranch(
  db: Db,
  accountId: number,
  branchId: number,
) {
  await ensureAccountBranchTable(db);

  const existing = await db.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id FROM AccountBranch WHERE accountId = ? AND branchId = ? LIMIT 1`,
    accountId,
    branchId,
  );
  if (existing[0]?.id) return { created: false };

  const hasPrimary = await db.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id FROM AccountBranch WHERE accountId = ? AND isPrimary = 1 LIMIT 1`,
    accountId,
  );
  const asPrimary = hasPrimary.length === 0 ? 1 : 0;

  await db.$executeRawUnsafe(
    `INSERT INTO AccountBranch (accountId, branchId, isPrimary) VALUES (?, ?, ?)`,
    accountId,
    branchId,
    asPrimary,
  );
  return { created: true, asPrimary: Boolean(asPrimary) };
}

/** Quita el vínculo cuenta↔local. Si era manager, limpia el encargado. */
export async function unlinkAccountFromBranch(
  db: Db,
  accountId: number,
  branchId: number,
) {
  await ensureAccountBranchTable(db);
  await ensureBranchManagerColumn(db);

  const wasPrimary = await db.$queryRawUnsafe<
    Array<{ isPrimary: number | boolean }>
  >(
    `SELECT isPrimary FROM AccountBranch WHERE accountId = ? AND branchId = ? LIMIT 1`,
    accountId,
    branchId,
  );

  await db.$executeRawUnsafe(
    `DELETE FROM AccountBranch WHERE accountId = ? AND branchId = ?`,
    accountId,
    branchId,
  );

  const managerId = await getBranchManagerAccountId(db, branchId);
  if (managerId === accountId) {
    await setBranchManagerAccountId(db, branchId, null);
  }

  if (wasPrimary[0] && Boolean(wasPrimary[0].isPrimary)) {
    const next = await db.$queryRawUnsafe<Array<{ id: number }>>(
      `SELECT id FROM AccountBranch WHERE accountId = ? ORDER BY id ASC LIMIT 1`,
      accountId,
    );
    if (next[0]?.id) {
      await db.$executeRawUnsafe(
        `UPDATE AccountBranch SET isPrimary = 1 WHERE id = ?`,
        next[0].id,
      );
    }
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
  await ensureBranchManagerColumn(db);
  const managerId = await getBranchManagerAccountId(db, branchId);

  const rows = await db.$queryRawUnsafe<
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

  return rows.map((t) => ({
    ...t,
    isManager: managerId != null && Number(t.accountId) === managerId,
  }));
}

/** Cuentas activas que aún no están en este local (para vincular). */
export async function listAccountsNotInBranch(db: Db, branchId: number) {
  return db.$queryRawUnsafe<
    Array<{
      accountId: number;
      username: string | null;
      firstName: string | null;
      firstLastName: string | null;
      roleName: string | null;
      isActive: boolean | number;
      currentBranchId: number | null;
      currentBranchName: string | null;
    }>
  >(
    `SELECT
       a.id AS accountId,
       a.username,
       a.isActive,
       p.firstName,
       p.firstLastName,
       (
         SELECT r.name FROM AccountRole ar
         INNER JOIN Role r ON r.id = ar.roleId
         WHERE ar.accountId = a.id
         ORDER BY ar.id ASC LIMIT 1
       ) AS roleName,
       (
         SELECT ab2.branchId FROM AccountBranch ab2
         WHERE ab2.accountId = a.id
         ORDER BY ab2.isPrimary DESC, ab2.id ASC
         LIMIT 1
       ) AS currentBranchId,
       (
         SELECT b2.name FROM AccountBranch ab2
         INNER JOIN Branch b2 ON b2.id = ab2.branchId
         WHERE ab2.accountId = a.id
         ORDER BY ab2.isPrimary DESC, ab2.id ASC
         LIMIT 1
       ) AS currentBranchName
     FROM Account a
     LEFT JOIN Person p ON p.id = a.userId
     WHERE a.isActive = 1
       AND a.id NOT IN (
         SELECT ab.accountId FROM AccountBranch ab WHERE ab.branchId = ?
       )
     ORDER BY
       (CASE WHEN (
         SELECT ab2.id FROM AccountBranch ab2 WHERE ab2.accountId = a.id LIMIT 1
       ) IS NULL THEN 0 ELSE 1 END) ASC,
       a.username ASC`,
    branchId,
  );
}

/**
 * Mueve una cuenta de un local a otro:
 * desvincula del origen, vincula al destino como primario.
 */
export async function moveAccountToBranch(
  db: Db,
  accountId: number,
  fromBranchId: number,
  toBranchId: number,
) {
  if (fromBranchId === toBranchId) return;
  await unlinkAccountFromBranch(db, accountId, fromBranchId);
  await linkAccountToBranch(db, accountId, toBranchId);
  // Asegurar que el destino sea su local primario de trabajo
  await setAccountPrimaryBranch(db, accountId, toBranchId);
}

export async function countAccountsByBranch(db: Db, branchId: number) {
  const rows = await db.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*) AS c FROM AccountBranch WHERE branchId = ?`,
    branchId,
  );
  return Number(rows[0]?.c ?? 0);
}

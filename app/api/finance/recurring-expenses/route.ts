import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
} from "@/shared/utils/roles";
import { recordLedgerExpense } from "@/shared/utils/finance-ledger";
import {
  ensureAccountBranchTable,
  ensureBranchManagerColumn,
} from "@/shared/utils/account-branch";

/** Gastos fijos típicos de un local (arriendo, servicios…). */
const DEFAULT_TEMPLATES = [
  { name: "Arriendo", category: "Arriendo", baseAmount: 0, dueDayOfMonth: 5 },
  { name: "Luz", category: "Servicios básicos", baseAmount: 0, dueDayOfMonth: 15 },
  { name: "Agua", category: "Servicios básicos", baseAmount: 0, dueDayOfMonth: 15 },
  { name: "Internet", category: "Servicios básicos", baseAmount: 0, dueDayOfMonth: 10 },
] as const;

function periodKeyNow(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dueDateFor(day: number | null | undefined, period = periodKeyNow()) {
  const [y, m] = period.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const dom = Math.min(Math.max(1, day ?? 1), last);
  return new Date(y, m - 1, dom, 12, 0, 0, 0);
}

function parseStoreId(raw: unknown): number | null {
  if (raw == null || raw === "" || raw === "all") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Locales que el usuario puede ver/operar. */
async function getAccessibleBranches(user: { id: number; role: string }) {
  if (isOwnerRole(user.role)) {
    return prisma.branch.findMany({
      where: { isActive: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
  }

  await ensureAccountBranchTable(prisma);
  await ensureBranchManagerColumn(prisma);

  const linked = await prisma.$queryRawUnsafe<Array<{ branchId: number }>>(
    `SELECT DISTINCT ab.branchId AS branchId
     FROM AccountBranch ab
     INNER JOIN Branch b ON b.id = ab.branchId
     WHERE ab.accountId = ? AND b.isActive = 1
     UNION
     SELECT b2.id AS branchId
     FROM Branch b2
     WHERE b2.managerAccountId = ? AND b2.isActive = 1`,
    user.id,
    user.id,
  );

  const ids = [...new Set(linked.map((r) => Number(r.branchId)).filter((n) => n > 0))];
  if (!ids.length) return [];

  return prisma.branch.findMany({
    where: { id: { in: ids }, isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

/**
 * Crea solo los fijos que falten en el local (por nombre).
 * Evita duplicar Agua/Luz si ya existen.
 */
async function ensureDefaultsForStore(storeId: number) {
  const existing = await prisma.recurringExpenseTemplate.findMany({
    where: { storeId, isActive: true },
    select: { id: true, name: true },
  });
  const have = new Set(existing.map((e) => normalizeName(e.name)));
  const missing = DEFAULT_TEMPLATES.filter((t) => !have.has(normalizeName(t.name)));
  if (!missing.length) return;

  await prisma.recurringExpenseTemplate.createMany({
    data: missing.map((t) => ({
      storeId,
      name: t.name,
      category: t.category,
      frequency: "monthly",
      amountType: "fixed",
      baseAmount: t.baseAmount,
      dueDayOfMonth: t.dueDayOfMonth,
      isActive: true,
      reminderEnabled: true,
    })),
  });
}

/** Desactiva plantillas duplicadas (mismo local + mismo nombre) y huérfanas sin local. */
async function dedupeTemplates(storeIds: number[]) {
  if (!storeIds.length) return;

  // Sin local: no sirven para el modelo por sucursal → desactivar
  await prisma.recurringExpenseTemplate.updateMany({
    where: { storeId: null, isActive: true },
    data: { isActive: false },
  });

  const rows = await prisma.recurringExpenseTemplate.findMany({
    where: { storeId: { in: storeIds }, isActive: true },
    select: { id: true, storeId: true, name: true },
    orderBy: { id: "asc" },
  });

  const firstByKey = new Map<string, number>();
  const drop: number[] = [];
  for (const row of rows) {
    const key = `${row.storeId ?? "x"}::${normalizeName(row.name)}`;
    if (!firstByKey.has(key)) {
      firstByKey.set(key, row.id);
    } else {
      drop.push(row.id);
    }
  }

  if (drop.length) {
    await prisma.recurringExpenseTemplate.updateMany({
      where: { id: { in: drop } },
      data: { isActive: false },
    });
  }
}

function serializeTemplate(
  t: {
    id: number;
    storeId: number | null;
    name: string;
    category: string | null;
    frequency: string | null;
    baseAmount: number;
    dueDayOfMonth: number | null;
    provider: string | null;
    note: string | null;
    isActive: boolean;
    occurrences: Array<{
      id: number;
      periodKey: string;
      amount: number;
      status: string;
      dueDate: Date | null;
      paidDate: Date | null;
      expenseId: number | null;
    }>;
    branch?: { id: number; name: string } | null;
  },
) {
  const occ = t.occurrences[0] ?? null;
  const status = occ?.status === "paid" ? "paid" : "pending";
  return {
    id: t.id,
    storeId: t.storeId,
    branchName: t.branch?.name ?? null,
    name: t.name,
    category: t.category,
    frequency: t.frequency ?? "monthly",
    baseAmount: t.baseAmount,
    dueDayOfMonth: t.dueDayOfMonth,
    provider: t.provider,
    note: t.note,
    isActive: t.isActive,
    status,
    statusLabel: status === "paid" ? "Pagado" : "Pendiente",
    amountThisMonth: occ?.amount ?? t.baseAmount ?? 0,
    occurrence: occ
      ? {
          id: occ.id,
          periodKey: occ.periodKey,
          amount: occ.amount,
          status: occ.status,
          dueDate: occ.dueDate?.toISOString() ?? null,
          paidDate: occ.paidDate?.toISOString() ?? null,
          expenseId: occ.expenseId,
        }
      : null,
  };
}

async function assertStoreAccess(
  user: { id: number; role: string },
  storeId: number | null,
  branches: Array<{ id: number }>,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (storeId == null) {
    if (isOwnerRole(user.role)) return { ok: true };
    return { ok: false, status: 403, message: "Indicá tu local" };
  }
  if (!branches.some((b) => b.id === storeId)) {
    return { ok: false, status: 403, message: "No tenés acceso a ese local" };
  }
  return { ok: true };
}

/**
 * GET /api/finance/recurring-expenses?storeId=
 * Dueña: todos o filtro por local.
 * Admin: solo locales vinculados (AccountBranch / encargado).
 */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const requestedStoreId = parseStoreId(url.searchParams.get("storeId"));
    const period = periodKeyNow();
    const canFilterStores = isOwnerRole(auth.user.role);
    const branches = await getAccessibleBranches(auth.user);

    if (!branches.length) {
      return NextResponse.json({
        periodKey: period,
        storeId: null,
        canFilterStores,
        lockedStoreId: null,
        branches: [],
        templates: [],
        message: "No hay locales asignados",
      });
    }

    let storeId = requestedStoreId;
    if (!canFilterStores) {
      // Admin: forzar su(s) local(es); si pide otro, 403
      if (storeId != null && !branches.some((b) => b.id === storeId)) {
        return NextResponse.json(
          { message: "No tenés acceso a ese local" },
          { status: 403 },
        );
      }
      if (branches.length === 1) {
        storeId = branches[0].id;
      }
    } else if (storeId != null && !branches.some((b) => b.id === storeId)) {
      return NextResponse.json(
        { message: "Local no encontrado" },
        { status: 404 },
      );
    }

    const seedIds = storeId != null ? [storeId] : branches.map((b) => b.id);
    for (const id of seedIds) {
      await ensureDefaultsForStore(id);
    }
    await dedupeTemplates(branches.map((b) => b.id));

    const templates = await prisma.recurringExpenseTemplate.findMany({
      where: {
        isActive: true,
        storeId:
          storeId != null
            ? storeId
            : { in: branches.map((b) => b.id) },
      },
      orderBy: [{ storeId: "asc" }, { name: "asc" }],
      include: {
        branch: { select: { id: true, name: true } },
        occurrences: {
          where: { periodKey: period },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      periodKey: period,
      storeId,
      canFilterStores,
      lockedStoreId: canFilterStores
        ? null
        : branches.length === 1
          ? branches[0].id
          : null,
      branches,
      templates: templates.map((t) => serializeTemplate(t)),
    });
  } catch (error) {
    console.error("GET /api/finance/recurring-expenses", error);
    return NextResponse.json(
      { message: "Error al listar gastos recurrentes" },
      { status: 500 },
    );
  }
}

/** POST crear plantilla (por local) o registrar pago del mes */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "create");
    const branches = await getAccessibleBranches(auth.user);

    if (action === "pay") {
      const templateId = Number(body.templateId);
      const amount = Number(body.amount);
      if (!Number.isInteger(templateId) || templateId <= 0) {
        return NextResponse.json({ message: "Plantilla inválida" }, { status: 400 });
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ message: "Monto inválido" }, { status: 400 });
      }

      const template = await prisma.recurringExpenseTemplate.findUnique({
        where: { id: templateId },
        include: { branch: { select: { id: true, name: true } } },
      });
      if (!template || !template.isActive) {
        return NextResponse.json({ message: "No encontrada" }, { status: 404 });
      }

      const access = await assertStoreAccess(
        auth.user,
        template.storeId,
        branches,
      );
      if (!access.ok) {
        return NextResponse.json(
          { message: access.message },
          { status: access.status },
        );
      }

      const period = periodKeyNow();
      const paidAt = new Date();
      const localLabel = template.branch?.name
        ? ` · ${template.branch.name}`
        : "";

      const result = await prisma.$transaction(async (tx) => {
        const expense = await recordLedgerExpense(tx, {
          amount,
          date: paidAt,
          concept: `${template.name}${localLabel} · ${period}`,
          category: template.category ?? "Gasto fijo",
          createdByAccountId: auth.user.id,
          counterpartyName: template.provider ?? template.branch?.name ?? undefined,
          referenceType: "recurring_expense",
          referenceId: templateId,
        });
        if (!expense) {
          throw new Error("No se pudo registrar el gasto");
        }

        const occurrence = await tx.recurringExpenseOccurrence.upsert({
          where: {
            templateId_periodKey: { templateId, periodKey: period },
          },
          create: {
            templateId,
            periodKey: period,
            amount,
            status: "paid",
            expenseId: expense.id,
            paidDate: paidAt,
            dueDate: dueDateFor(template.dueDayOfMonth, period),
          },
          update: {
            amount,
            status: "paid",
            expenseId: expense.id,
            paidDate: paidAt,
          },
        });

        return { expense, occurrence };
      });

      return NextResponse.json(result, { status: 201 });
    }

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }

    let storeId = parseStoreId(body.storeId);
    if (isBranchAdminRole(auth.user.role) && !isOwnerRole(auth.user.role)) {
      if (branches.length === 1) {
        storeId = branches[0].id;
      } else if (storeId == null || !branches.some((b) => b.id === storeId)) {
        return NextResponse.json(
          { message: "Elegí un local válido" },
          { status: 400 },
        );
      }
    } else {
      const access = await assertStoreAccess(auth.user, storeId, branches);
      if (!access.ok || storeId == null) {
        return NextResponse.json(
          { message: storeId == null ? "Elegí el local" : access.message },
          { status: storeId == null ? 400 : access.status },
        );
      }
    }

    const dup = await prisma.recurringExpenseTemplate.findFirst({
      where: {
        storeId,
        isActive: true,
        name: { equals: name },
      },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json(
        { message: `Ya existe «${name}» en ese local` },
        { status: 409 },
      );
    }

    const template = await prisma.recurringExpenseTemplate.create({
      data: {
        storeId,
        name,
        category: String(body.category ?? "Gasto fijo").trim() || "Gasto fijo",
        frequency: "monthly",
        amountType: "fixed",
        baseAmount: Number(body.baseAmount ?? 0),
        dueDayOfMonth: Number(body.dueDayOfMonth ?? 1) || 1,
        provider: body.provider ? String(body.provider) : null,
        note: body.note ? String(body.note) : null,
        isActive: body.isActive !== false,
        reminderEnabled: true,
        createdBy: auth.user.id,
      },
      include: { branch: { select: { id: true, name: true } } },
    });

    return NextResponse.json(
      {
        ...template,
        branchName: template.branch?.name ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/finance/recurring-expenses", error);
    return NextResponse.json(
      { message: "Error al guardar" },
      { status: 400 },
    );
  }
}

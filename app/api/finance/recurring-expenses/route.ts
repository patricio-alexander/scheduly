import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { recordLedgerExpense } from "@/shared/utils/finance-ledger";

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

/** GET plantillas + ocurrencias del mes actual */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    let templates = await prisma.recurringExpenseTemplate.findMany({
      orderBy: { name: "asc" },
      include: {
        occurrences: {
          where: { periodKey: periodKeyNow() },
          take: 1,
        },
      },
    });

    if (templates.length === 0) {
      await prisma.recurringExpenseTemplate.createMany({
        data: DEFAULT_TEMPLATES.map((t) => ({
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
      templates = await prisma.recurringExpenseTemplate.findMany({
        orderBy: { name: "asc" },
        include: {
          occurrences: {
            where: { periodKey: periodKeyNow() },
            take: 1,
          },
        },
      });
    }

    return NextResponse.json({
      periodKey: periodKeyNow(),
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        frequency: t.frequency ?? "monthly",
        baseAmount: t.baseAmount,
        dueDayOfMonth: t.dueDayOfMonth,
        provider: t.provider,
        note: t.note,
        isActive: t.isActive,
        occurrence: t.occurrences[0]
          ? {
              id: t.occurrences[0].id,
              periodKey: t.occurrences[0].periodKey,
              amount: t.occurrences[0].amount,
              status: t.occurrences[0].status,
              dueDate: t.occurrences[0].dueDate?.toISOString() ?? null,
              paidDate: t.occurrences[0].paidDate?.toISOString() ?? null,
              expenseId: t.occurrences[0].expenseId,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("GET /api/finance/recurring-expenses", error);
    return NextResponse.json(
      { message: "Error al listar gastos recurrentes" },
      { status: 500 },
    );
  }
}

/** POST crear plantilla o registrar pago del mes */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "create");

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
      });
      if (!template) {
        return NextResponse.json({ message: "No encontrada" }, { status: 404 });
      }

      const period = periodKeyNow();
      const paidAt = new Date();

      const result = await prisma.$transaction(async (tx) => {
        const expense = await recordLedgerExpense(tx, {
          amount,
          date: paidAt,
          concept: `${template.name} · ${period}`,
          category: template.category ?? "Gasto fijo",
          createdByAccountId: auth.user.id,
          counterpartyName: template.provider ?? undefined,
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

    const template = await prisma.recurringExpenseTemplate.create({
      data: {
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
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("POST /api/finance/recurring-expenses", error);
    return NextResponse.json(
      { message: "Error al guardar" },
      { status: 400 },
    );
  }
}

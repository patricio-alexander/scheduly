import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import { isManagementRole } from "@/shared/utils/roles";

/** Ledger completo de gastos (estilo EdDeli), sin filtro de período. */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const expenses = await prisma.expense.findMany({
      where: { status: "paid" },
      orderBy: { date: "desc" },
      take: 1000,
    });
    return NextResponse.json(
      expenses.map((e) => ({
        id: e.id,
        date: e.date.toISOString(),
        amount: toAmount(e.amount),
        concept: e.concept ?? "",
        category: e.category ?? "",
        status: e.status,
        counterpartyName: e.counterpartyName,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
      })),
    );
  } catch (error) {
    console.error("GET /api/finance/expenses-ledger", error);
    return NextResponse.json(
      { message: "Error al obtener gastos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: "Monto inválido" }, { status: 400 });
    }
    const dateRaw = body.date ? new Date(String(body.date)) : new Date();
    const created = await prisma.expense.create({
      data: {
        amount,
        concept: String(body.concept ?? "").trim() || null,
        category: String(body.category ?? "").trim() || null,
        date: Number.isNaN(dateRaw.getTime()) ? new Date() : dateRaw,
        status: "paid",
        createdBy: auth.user.id,
        counterpartyName: body.counterpartyName
          ? String(body.counterpartyName)
          : null,
      },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/finance/expenses-ledger", error);
    return NextResponse.json(
      { message: "Error al crear gasto" },
      { status: 400 },
    );
  }
}

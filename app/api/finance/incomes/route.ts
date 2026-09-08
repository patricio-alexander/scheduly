import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import { isManagementRole } from "@/shared/utils/roles";
import { prisma } from "@/shared/utils/prisma";
import { listFinanceIncomes } from "@/shared/utils/finance-ledger-list";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const rows = await listFinanceIncomes(2000);
    return NextResponse.json(
      rows.map((i) => ({
        id: i.id,
        date: i.date,
        amount: toAmount(i.amount),
        concept: i.concept,
        category: i.category,
        status: i.status,
        counterpartyName: i.counterpartyName,
        referenceType: i.referenceType,
        referenceId: i.referenceId,
        persisted: i.persisted,
      })),
    );
  } catch (error) {
    console.error("GET /api/finance/incomes", error);
    return NextResponse.json(
      { message: "Error al obtener ingresos" },
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
    const created = await prisma.income.create({
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
    console.error("POST /api/finance/incomes", error);
    return NextResponse.json(
      { message: "Error al crear ingreso" },
      { status: 400 },
    );
  }
}

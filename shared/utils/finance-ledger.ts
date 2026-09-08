import type { PrismaClient } from "@/generated/prisma/client";
import { toAmount } from "@/shared/utils/money";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/** Registra ingreso en el ledger (módulo Finanzas) al cobrar cita o venta POS. */
export async function recordLedgerIncome(
  tx: Tx,
  opts: {
    amount: number;
    date: Date;
    concept: string;
    category: string;
    createdByAccountId: number;
    counterpartyName?: string | null;
    referenceType: string;
    referenceId: number;
  },
) {
  const amount = toAmount(opts.amount);
  if (amount <= 0) return null;

  return tx.income.create({
    data: {
      amount,
      date: opts.date,
      concept: opts.concept,
      category: opts.category,
      status: "paid",
      createdBy: opts.createdByAccountId,
      counterpartyName: opts.counterpartyName ?? null,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
    },
  });
}

/** Gasto ledger al pagar compra a proveedor. */
export async function recordLedgerExpense(
  tx: Tx,
  opts: {
    amount: number;
    date: Date;
    concept: string;
    category: string;
    createdByAccountId: number;
    counterpartyName?: string | null;
    referenceType: string;
    referenceId: number;
  },
) {
  const amount = toAmount(opts.amount);
  if (amount <= 0) return null;

  return tx.expense.create({
    data: {
      amount,
      date: opts.date,
      concept: opts.concept,
      category: opts.category,
      status: "paid",
      createdBy: opts.createdByAccountId,
      counterpartyName: opts.counterpartyName ?? null,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
    },
  });
}

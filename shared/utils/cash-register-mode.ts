/**
 * Modo de caja definido por la dueña.
 * - employee_own: cada empleado/admin abre y cierra su propia caja
 * - branch_shared: solo admin abre caja del local; el personal cobra bajo esa caja
 */
import {
  parseReceiptDetailSettings,
  serializeReceiptDetailSettings,
} from "@/shared/utils/agenda-hours";

export type CashRegisterMode = "employee_own" | "branch_shared";

export const DEFAULT_CASH_REGISTER_MODE: CashRegisterMode = "employee_own";

export function normalizeCashRegisterMode(
  raw: unknown,
): CashRegisterMode {
  const v = String(raw ?? "").trim();
  if (v === "branch_shared" || v === "shared" || v === "sucursal") {
    return "branch_shared";
  }
  return "employee_own";
}

export function cashRegisterModeFromReceiptSettings(
  raw: unknown,
): CashRegisterMode {
  const blob = parseReceiptDetailSettings(raw);
  return normalizeCashRegisterMode(blob.cashRegisterMode);
}

export function mergeOpsIntoReceiptSettings(
  raw: unknown,
  ops: {
    bookingStartHour?: number;
    bookingEndHour?: number;
    cashRegisterMode?: CashRegisterMode;
  },
): string {
  const blob = parseReceiptDetailSettings(raw);
  return serializeReceiptDetailSettings({
    ...blob,
    ...(ops.bookingStartHour !== undefined
      ? { bookingStartHour: ops.bookingStartHour }
      : {}),
    ...(ops.bookingEndHour !== undefined
      ? { bookingEndHour: ops.bookingEndHour }
      : {}),
    ...(ops.cashRegisterMode !== undefined
      ? { cashRegisterMode: ops.cashRegisterMode }
      : {}),
  });
}

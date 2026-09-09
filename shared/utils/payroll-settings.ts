/**
 * Config de liquidación semanal (receiptDetailSettings JSON · sin migrate extra).
 * Semana por defecto: lunes (1) → domingo.
 */
import {
  parseReceiptDetailSettings,
  serializeReceiptDetailSettings,
} from "@/shared/utils/agenda-hours";

/** 0=domingo … 6=sábado (igual que Date.getDay()). Default lunes = 1. */
export type PayrollSettings = {
  payrollWeekStartDay: number;
  /** Si true, admin de sucursal también puede armar liquidación de su local. */
  payrollAllowBranchAdmin: boolean;
};

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  payrollWeekStartDay: 1,
  payrollAllowBranchAdmin: false,
};

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
] as const;

export function normalizePayrollSettings(
  raw?: Partial<PayrollSettings> | null,
): PayrollSettings {
  const day = Number(raw?.payrollWeekStartDay);
  const payrollWeekStartDay =
    Number.isInteger(day) && day >= 0 && day <= 6
      ? day
      : DEFAULT_PAYROLL_SETTINGS.payrollWeekStartDay;
  return {
    payrollWeekStartDay,
    payrollAllowBranchAdmin: Boolean(
      raw?.payrollAllowBranchAdmin ??
        DEFAULT_PAYROLL_SETTINGS.payrollAllowBranchAdmin,
    ),
  };
}

export function payrollSettingsFromReceiptSettings(
  raw: unknown,
): PayrollSettings {
  const blob = parseReceiptDetailSettings(raw);
  return normalizePayrollSettings({
    payrollWeekStartDay:
      typeof blob.payrollWeekStartDay === "number"
        ? blob.payrollWeekStartDay
        : undefined,
    payrollAllowBranchAdmin:
      typeof blob.payrollAllowBranchAdmin === "boolean"
        ? blob.payrollAllowBranchAdmin
        : undefined,
  });
}

export function mergePayrollIntoReceiptSettings(
  raw: unknown,
  settings: PayrollSettings,
): string {
  const blob = parseReceiptDetailSettings(raw);
  return serializeReceiptDetailSettings({
    ...blob,
    payrollWeekStartDay: settings.payrollWeekStartDay,
    payrollAllowBranchAdmin: settings.payrollAllowBranchAdmin,
  });
}

/** Inicio del día local a las 00:00. */
export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Rango de la semana que contiene `ref`, según día de inicio configurado. */
export function getPayrollWeekRange(
  ref: Date,
  weekStartDay: number,
): { start: Date; end: Date } {
  const day = startOfLocalDay(ref);
  const current = day.getDay();
  const startDow =
    Number.isInteger(weekStartDay) && weekStartDay >= 0 && weekStartDay <= 6
      ? weekStartDay
      : 1;
  const diff = (current - startDow + 7) % 7;
  const start = new Date(day);
  start.setDate(start.getDate() - diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: startOfLocalDay(start), end: endOfLocalDay(end) };
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key).trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function calcPayrollLineTotal(line: {
  producedAmount: number;
  salesAmount: number;
  vouchersAmount: number;
  cafeteriaAmount: number;
  finesAmount: number;
  discountsAmount: number;
  additionalAmount: number;
}): number {
  const total =
    line.producedAmount +
    line.salesAmount +
    line.additionalAmount -
    line.vouchersAmount -
    line.cafeteriaAmount -
    line.finesAmount -
    line.discountsAmount;
  return Math.round(total * 100) / 100;
}

"use client";

export type CashGranularity = "day" | "week" | "month";

export type CashFlowCandle = {
  key: string;
  label: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  overdraft: boolean;
  bullish: boolean;
};

export type CashFlowMirrorFocus = {
  granularity: "day" | "week" | "month";
  startDate: string;
  endDate: string;
  highlightKey?: string;
};

function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseKeyToDate(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1, 12, 0, 0, 0);
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const weekday = value.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  value.setDate(value.getDate() + diff);
  return value;
}

function endOfWeek(date: Date) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function resolveMirrorFromCandle(
  granularity: CashGranularity,
  candle: CashFlowCandle,
): CashFlowMirrorFocus {
  const sourceDate = parseKeyToDate(candle.key);

  if (granularity === "month") {
    const monthStart = startOfMonth(sourceDate);
    const monthEnd = endOfMonth(sourceDate);
    return {
      granularity: "week",
      startDate: toDayKey(monthStart),
      endDate: toDayKey(monthEnd),
    };
  }

  if (granularity === "week") {
    const weekStart = startOfWeek(sourceDate);
    const weekEnd = endOfWeek(sourceDate);
    return {
      granularity: "day",
      startDate: toDayKey(weekStart),
      endDate: toDayKey(weekEnd),
    };
  }

  const weekStart = startOfWeek(sourceDate);
  const weekEnd = endOfWeek(sourceDate);
  return {
    granularity: "day",
    startDate: toDayKey(weekStart),
    endDate: toDayKey(weekEnd),
    highlightKey: candle.key,
  };
}

/** Semana en curso (lunes–domingo) para el mirror por defecto. */
export function currentWeekMirrorFocus(reference: Date = new Date()): CashFlowMirrorFocus {
  return {
    granularity: "day",
    startDate: toDayKey(startOfWeek(reference)),
    endDate: toDayKey(endOfWeek(reference)),
  };
}

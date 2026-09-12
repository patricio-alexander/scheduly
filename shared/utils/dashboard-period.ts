export type DashboardPeriod = "today" | "week" | "month" | "all";

export const dashboardPeriodOptions: DashboardPeriod[] = [
  "all",
  "month",
  "week",
  "today",
];

export const dashboardPeriodLabel: Record<DashboardPeriod, string> = {
  all: "Todo",
  today: "Hoy",
  week: "Semana",
  month: "Mes",
};

export function parseDashboardPeriod(value: string | null): DashboardPeriod {
  if (value === "today" || value === "week" || value === "month" || value === "all") {
    return value;
  }
  return "all";
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getDashboardPeriodRange(period: DashboardPeriod, reference = new Date()) {
  const end = endOfDay(reference);

  if (period === "today") {
    return { start: startOfDay(reference), end, period };
  }

  if (period === "week") {
    const start = startOfDay(reference);
    start.setDate(start.getDate() - 6);
    return { start, end, period };
  }

  if (period === "month") {
    const start = startOfDay(reference);
    start.setDate(1);
    return { start, end, period };
  }

  const start = startOfDay(new Date(2000, 0, 1));
  return { start, end, period };
}

export function getDashboardChartBuckets(
  period: DashboardPeriod,
  reference = new Date(),
): Array<{ key: string; label: string; start: Date; end: Date }> {
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];

  if (period === "today") {
    for (let hour = 8; hour <= 20; hour++) {
      const start = startOfDay(reference);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour, 59, 59, 999);
      buckets.push({
        key: `${hour}`,
        label: `${String(hour).padStart(2, "0")}:00`,
        start,
        end,
      });
    }
    return buckets;
  }

  if (period === "week") {
    const range = getDashboardPeriodRange("week", reference);
    for (let i = 0; i < 7; i++) {
      const day = new Date(range.start);
      day.setDate(range.start.getDate() + i);
      buckets.push({
        key: day.toISOString().slice(0, 10),
        label: day.toLocaleDateString("es-EC", { weekday: "short" }),
        start: startOfDay(day),
        end: endOfDay(day),
      });
    }
    return buckets;
  }

  if (period === "all") {
    const range = getDashboardPeriodRange("all", reference);
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (cursor <= reference) {
      const start = startOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
      const end = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
      buckets.push({
        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
        label: cursor.toLocaleDateString("es-EC", { month: "short", year: "2-digit" }),
        start,
        end,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const monthStart = startOfDay(reference);
  monthStart.setDate(1);
  const cursor = new Date(monthStart);
  while (cursor <= reference) {
    buckets.push({
      key: cursor.toISOString().slice(0, 10),
      label: cursor.toLocaleDateString("es-EC", { day: "numeric", month: "short" }),
      start: startOfDay(cursor),
      end: endOfDay(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

/** Buckets más finos solo para el gráfico de barras de actividad. */
export function getDashboardActivityChartBuckets(
  period: DashboardPeriod,
  reference = new Date(),
): Array<{ key: string; label: string; start: Date; end: Date }> {
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];

  if (period === "today") {
    for (let hour = 8; hour <= 19; hour++) {
      for (const minute of [0, 30] as const) {
        const start = startOfDay(reference);
        start.setHours(hour, minute, 0, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 29, 59, 999);
        buckets.push({
          key: `${hour}-${minute}`,
          label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          start,
          end,
        });
      }
    }
    return buckets;
  }

  if (period === "week") {
    const range = getDashboardPeriodRange("week", reference);
    const daySlots = [
      { suffix: "9-11", startHour: 9, endHour: 11, endMinute: 59 },
      { suffix: "12-14", startHour: 12, endHour: 14, endMinute: 59 },
      { suffix: "15-17", startHour: 15, endHour: 17, endMinute: 59 },
      { suffix: "18-20", startHour: 18, endHour: 19, endMinute: 59 },
    ] as const;

    for (let i = 0; i < 7; i++) {
      const day = new Date(range.start);
      day.setDate(range.start.getDate() + i);
      const dayLabel = day.toLocaleDateString("es-EC", { weekday: "short" });

      for (const slot of daySlots) {
        const start = startOfDay(day);
        start.setHours(slot.startHour, 0, 0, 0);
        const end = startOfDay(day);
        end.setHours(slot.endHour, slot.endMinute, 59, 999);

        buckets.push({
          key: `${day.toISOString().slice(0, 10)}-${slot.suffix}`,
          label: `${dayLabel} ${slot.suffix}`,
          start,
          end,
        });
      }
    }
    return buckets;
  }

  if (period === "all") {
    return getDashboardChartBuckets("all", reference);
  }

  const monthStart = startOfDay(reference);
  monthStart.setDate(1);
  const cursor = new Date(monthStart);
  while (cursor <= reference) {
    for (const slot of [
      { suffix: "AM", startHour: 9, endHour: 13, endMinute: 59 },
      { suffix: "PM", startHour: 14, endHour: 19, endMinute: 59 },
    ] as const) {
      const start = startOfDay(cursor);
      start.setHours(slot.startHour, 0, 0, 0);
      const end = startOfDay(cursor);
      end.setHours(slot.endHour, slot.endMinute, 59, 999);
      const dayLabel = cursor.toLocaleDateString("es-EC", {
        day: "numeric",
        month: "short",
      });

      buckets.push({
        key: `${cursor.toISOString().slice(0, 10)}-${slot.suffix}`,
        label: `${dayLabel} ${slot.suffix}`,
        start,
        end,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

export function getDashboardPeriodDescription(period: DashboardPeriod): string {
  if (period === "today") return "Hoy";
  if (period === "week") return "Últimos 7 días";
  if (period === "month") return "Mes en curso";
  return "Todo el histórico";
}

/** Rango del período inmediatamente anterior (misma duración relativa). */
export function getDashboardPreviousPeriodRange(
  period: DashboardPeriod,
  reference = new Date(),
) {
  const current = getDashboardPeriodRange(period, reference);

  if (period === "today") {
    const prevDay = new Date(reference);
    prevDay.setDate(prevDay.getDate() - 1);
    return getDashboardPeriodRange("today", prevDay);
  }

  if (period === "week") {
    const prevEnd = new Date(current.start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    return getDashboardPeriodRange("week", prevEnd);
  }

  if (period === "all") {
    return { start: current.start, end: current.start, period };
  }

  const prevMonthEnd = new Date(current.start);
  prevMonthEnd.setDate(0);
  return getDashboardPeriodRange("month", prevMonthEnd);
}

export function getDashboardComparisonLabel(period: DashboardPeriod): string {
  if (period === "today") return "vs ayer";
  if (period === "week") return "vs 7 días previos";
  if (period === "month") return "vs mes anterior";
  return "histórico";
}

/** Variación porcentual; null si no hay base comparable (prev=0 y current>0). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

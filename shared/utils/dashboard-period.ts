export type DashboardPeriod = "today" | "week" | "month";

export const dashboardPeriodOptions: DashboardPeriod[] = ["today", "week", "month"];

export const dashboardPeriodLabel: Record<DashboardPeriod, string> = {
  today: "Hoy",
  week: "Semana",
  month: "Mes",
};

export function parseDashboardPeriod(value: string | null): DashboardPeriod {
  if (value === "today" || value === "week" || value === "month") return value;
  return "week";
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

  const start = startOfDay(reference);
  start.setDate(1);
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
        label: day.toLocaleDateString("es-CL", { weekday: "short" }),
        start: startOfDay(day),
        end: endOfDay(day),
      });
    }
    return buckets;
  }

  const monthStart = startOfDay(reference);
  monthStart.setDate(1);
  const cursor = new Date(monthStart);
  while (cursor <= reference) {
    buckets.push({
      key: cursor.toISOString().slice(0, 10),
      label: cursor.toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
      start: startOfDay(cursor),
      end: endOfDay(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

export function getDashboardPeriodDescription(period: DashboardPeriod): string {
  if (period === "today") return "Hoy";
  if (period === "week") return "Últimos 7 días";
  return "Mes en curso";
}

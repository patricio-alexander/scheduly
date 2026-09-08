import {
  DEFAULT_BOOKING_END_HOUR,
  DEFAULT_BOOKING_START_HOUR,
} from "@/shared/utils/agenda-hours";

/** @deprecated Preferir getAgendaHours() / AppSettings */
export const BOOKING_DAY_START_HOUR = DEFAULT_BOOKING_START_HOUR;
/** @deprecated Preferir getAgendaHours() / AppSettings */
export const BOOKING_DAY_END_HOUR = DEFAULT_BOOKING_END_HOUR;
export const DEFAULT_SERVICE_DURATION_MINUTES = 30;

export function startOfLocalDay(dateStr: string) {
  // dateStr = YYYY-MM-DD
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function endOfLocalDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && startB < endA;
}

export function buildDaySlots(
  dateStr: string,
  durationMinutes: number,
  busy: Array<{ start: number; end: number }>,
  now = new Date(),
  hours?: { bookingStartHour?: number; bookingEndHour?: number },
) {
  const startH = hours?.bookingStartHour ?? BOOKING_DAY_START_HOUR;
  const endH = hours?.bookingEndHour ?? BOOKING_DAY_END_HOUR;
  const dayStart = startOfLocalDay(dateStr);
  const open = new Date(dayStart);
  open.setHours(startH, 0, 0, 0);
  const close = new Date(dayStart);
  close.setHours(endH, 0, 0, 0);

  const slots: string[] = [];
  const stepMs = durationMinutes * 60_000;
  let cursor = open.getTime();
  const closeMs = close.getTime();

  while (cursor + stepMs <= closeMs) {
    const slotEnd = cursor + stepMs;
    const isPast = cursor < now.getTime();
    const conflict = busy.some((b) => overlaps(cursor, slotEnd, b.start, b.end));
    if (!isPast && !conflict) {
      slots.push(new Date(cursor).toISOString());
    }
    cursor += stepMs;
  }

  return slots;
}

export function formatDurationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? "1 h" : `${h} h`;
  return `${h} h ${m} min`;
}

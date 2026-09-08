/**
 * Horario de agenda / atención que define la dueña (hora local del servidor).
 * Persistido en AppSettings.receiptDetailSettings (JSON) para no exigir migrate.
 */
export const DEFAULT_BOOKING_START_HOUR = 9;
export const DEFAULT_BOOKING_END_HOUR = 18;

export type AgendaHours = {
  bookingStartHour: number;
  bookingEndHour: number;
};

type ReceiptBlob = {
  bookingStartHour?: number;
  bookingEndHour?: number;
  [key: string]: unknown;
};

export function parseReceiptDetailSettings(raw: unknown): ReceiptBlob {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as ReceiptBlob;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as ReceiptBlob;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export function serializeReceiptDetailSettings(blob: ReceiptBlob): string {
  return JSON.stringify(blob);
}

export function normalizeAgendaHours(raw?: {
  bookingStartHour?: unknown;
  bookingEndHour?: unknown;
} | null): AgendaHours {
  const start = Number(raw?.bookingStartHour);
  const end = Number(raw?.bookingEndHour);
  const bookingStartHour =
    Number.isInteger(start) && start >= 0 && start <= 23
      ? start
      : DEFAULT_BOOKING_START_HOUR;
  let bookingEndHour =
    Number.isInteger(end) && end >= 1 && end <= 24
      ? end
      : DEFAULT_BOOKING_END_HOUR;
  if (bookingEndHour <= bookingStartHour) {
    bookingEndHour = Math.min(24, bookingStartHour + 1);
  }
  return { bookingStartHour, bookingEndHour };
}

export function agendaHoursFromReceiptSettings(raw: unknown): AgendaHours {
  return normalizeAgendaHours(parseReceiptDetailSettings(raw));
}

export function mergeAgendaHoursIntoReceiptSettings(
  raw: unknown,
  hours: AgendaHours,
): string {
  const blob = parseReceiptDetailSettings(raw);
  return serializeReceiptDetailSettings({
    ...blob,
    bookingStartHour: hours.bookingStartHour,
    bookingEndHour: hours.bookingEndHour,
  });
}

/** Valida que la fecha del turno caiga en [start, end) hora local. */
export function assertAppointmentWithinAgendaHours(
  date: Date,
  hours: AgendaHours,
): void {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const asMinutes = hour * 60 + minute;
  const open = hours.bookingStartHour * 60;
  const close = hours.bookingEndHour * 60;
  if (asMinutes < open || asMinutes >= close) {
    throw new Error(
      `Fuera del horario de agenda (${pad(hours.bookingStartHour)}:00–${pad(hours.bookingEndHour)}:00)`,
    );
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatAgendaHoursLabel(hours: AgendaHours) {
  return `${pad(hours.bookingStartHour)}:00–${pad(hours.bookingEndHour)}:00`;
}

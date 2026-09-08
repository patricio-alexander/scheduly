/** Formato de fecha/hora del sistema: día + hora:minuto:segundo (es-EC). */

const DT_OPTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

export function formatDateTime(value: Date | string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-EC", DT_OPTS);
}

/** Solo hora HH:mm:ss */
export function formatTime(value: Date | string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Stamp corto para terminal / logs de scripts */
export function formatStampNow(): string {
  return formatDateTime(new Date());
}

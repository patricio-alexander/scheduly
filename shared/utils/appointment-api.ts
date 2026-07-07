import { AppointmentStatus } from "@/generated/prisma/client";

const validStatuses = new Set<string>(Object.values(AppointmentStatus));

export function parseAppointmentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha de turno inválida");
  }
  return date;
}

export function parseAppointmentStatus(value: unknown): AppointmentStatus {
  const status = String(value ?? "scheduled");
  if (!validStatuses.has(status)) {
    throw new Error(`Estado de turno inválido: ${status}`);
  }
  return status as AppointmentStatus;
}

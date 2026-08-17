import type { Server as IOServer } from "socket.io";
import {
  normalizeThemeColors,
  type ThemeColors,
} from "@/shared/utils/business-profile";

export const TASKS_ROOM = "tasks";
export const APPOINTMENTS_ROOM = "appointments";

declare global {
  // eslint-disable-next-line no-var
  var __schedulyIo: IOServer | undefined;
}

export function setIO(io: IOServer) {
  globalThis.__schedulyIo = io;
}

export function getIO(): IOServer | undefined {
  return globalThis.__schedulyIo;
}

/** Serializa fechas Prisma → ISO para el cliente */
function toClientPayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emitAll(event: string, payload: unknown) {
  const io = getIO();
  if (!io) {
    console.warn(`[socket] IO no inicializado · ${event} no emitido`);
    return;
  }
  io.emit(event, toClientPayload(payload));
}

export function invalidateDashboard(reason: string) {
  emitAll("dashboard:invalidate", { reason, at: Date.now() });
}

export function emitTaskCreated(task: unknown) {
  emitAll("task:created", task);
}

export function emitTaskUpdated(task: unknown) {
  emitAll("task:updated", task);
}

export function emitTaskDeleted(id: number) {
  emitAll("task:deleted", { id });
}

export function emitAppointmentCreated(event: unknown) {
  emitAll("appointment:created", event);
  invalidateDashboard("appointment:created");
}

export function emitAppointmentUpdated(event: unknown) {
  emitAll("appointment:updated", event);
  invalidateDashboard("appointment:updated");
}

export function emitAppointmentDeleted(id: number) {
  emitAll("appointment:deleted", { id: String(id) });
  invalidateDashboard("appointment:deleted");
}

export function emitCustomerCreated(customer: unknown) {
  emitAll("customer:created", customer);
  invalidateDashboard("customer:created");
}

export function emitCustomerUpdated(customer: unknown) {
  emitAll("customer:updated", customer);
  invalidateDashboard("customer:updated");
}

export function emitCustomerDeleted(id: number) {
  emitAll("customer:deleted", { id });
  invalidateDashboard("customer:deleted");
}

/** Colores de marca globales (todas las sucursales / clientes conectados). */
export function emitThemeColorsUpdated(colors: Partial<ThemeColors>) {
  emitAll("theme:colors-updated", normalizeThemeColors(colors));
}

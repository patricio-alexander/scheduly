/**
 * Runtime de Scheduly:
 * - `dev`     → desarrollo local sin Gestor (todo abierto)
 * - `gestor`  → enlazado a suscripción / entitlements del Gestor
 *
 * Scripts: `npm run dev` | `npm run schedully`
 *
 * Importante: el acceso a `process.env.NEXT_PUBLIC_SCHEDULY_RUNTIME` debe ser
 * estático para que Next lo inyecte en el cliente.
 */
export type SchedulyRuntime = "dev" | "gestor";

export function getSchedulyRuntime(): SchedulyRuntime {
  // Solo "gestor" activa el gate. Cualquier otro valor (o vacío) = desarrollo.
  const runtime = process.env.NEXT_PUBLIC_SCHEDULY_RUNTIME;
  return runtime === "gestor" ? "gestor" : "dev";
}

/** Desarrollo libre: sin gate ni sync con el Gestor. */
export function isSchedulyDevRuntime() {
  return process.env.NEXT_PUBLIC_SCHEDULY_RUNTIME !== "gestor";
}

/** Modo enlazado al Gestor (suscripción / módulos). */
export function isSchedulyGestorRuntime() {
  return process.env.NEXT_PUBLIC_SCHEDULY_RUNTIME === "gestor";
}

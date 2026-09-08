/**
 * Scheduly es standalone: sin vínculo al Gestor.
 * Se mantienen estos helpers por compatibilidad con imports existentes.
 */
export type SchedulyRuntime = "standalone";

export function getSchedulyRuntime(): SchedulyRuntime {
  return "standalone";
}

/** Siempre true: módulos abiertos, sin gate de suscripción. */
export function isSchedulyDevRuntime() {
  return true;
}

/** Siempre false: ya no existe modo enlazado al Gestor. */
export function isSchedulyGestorRuntime() {
  return false;
}

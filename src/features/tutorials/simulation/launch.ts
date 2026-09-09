import { appRoutes } from "@/shared/utils/app-routes";

/** sessionStorage: al terminar el tour, volver al hub de Tutoriales. */
export const TUTORIALS_RETURN_KEY = "scheduly:tutorials-return";

export const TOUR_DESTROYED_EVENT = "scheduly:tour-destroyed";
export const TUTORIALS_RETURN_EVENT = "scheduly:tutorials-return";

export function armTutorialsReturn(
  path: string = appRoutes.system.tutorials,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TUTORIALS_RETURN_KEY, path);
}

export function clearTutorialsReturn(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TUTORIALS_RETURN_KEY);
}

export function peekTutorialsReturn(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TUTORIALS_RETURN_KEY);
}

export function consumeTutorialsReturn(): string | null {
  if (typeof window === "undefined") return null;
  const path = sessionStorage.getItem(TUTORIALS_RETURN_KEY);
  if (path) sessionStorage.removeItem(TUTORIALS_RETURN_KEY);
  return path;
}

/** Avisa al shell que debe volver al hub (si había return armado). */
export function notifyTourDestroyed(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOUR_DESTROYED_EVENT));
  const path = consumeTutorialsReturn();
  if (path) {
    window.dispatchEvent(
      new CustomEvent(TUTORIALS_RETURN_EVENT, { detail: { path } }),
    );
  }
}

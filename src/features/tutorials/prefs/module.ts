/** Preferencias de tours driver.js por módulo/pantalla. */
export const MODULE_TUTORIAL_STORAGE_KEY = "scheduly-tutorial-modules-v1";

export type ModuleTutorialPrefs = {
  /** tourId → ya visto / omitido */
  seen: Record<string, boolean>;
};

const DEFAULT: ModuleTutorialPrefs = { seen: {} };

export function readModuleTutorialPrefs(): ModuleTutorialPrefs {
  try {
    const raw = localStorage.getItem(MODULE_TUTORIAL_STORAGE_KEY);
    if (!raw) return { seen: {} };
    const parsed = JSON.parse(raw) as Partial<ModuleTutorialPrefs>;
    return {
      seen:
        parsed.seen && typeof parsed.seen === "object" ? { ...parsed.seen } : {},
    };
  } catch {
    return { seen: {} };
  }
}

export function isModuleTourSeen(tourId: string): boolean {
  return Boolean(readModuleTutorialPrefs().seen[tourId]);
}

export function markModuleTourSeen(tourId: string) {
  const prev = readModuleTutorialPrefs();
  const next: ModuleTutorialPrefs = {
    seen: { ...prev.seen, [tourId]: true },
  };
  try {
    localStorage.setItem(MODULE_TUTORIAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

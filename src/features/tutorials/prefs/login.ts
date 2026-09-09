/** Persistencia local del tutorial de login (por navegador). */
export const LOGIN_TUTORIAL_STORAGE_KEY = "scheduly-tutorial-login-v1";

export type LoginTutorialPrefs = {
  /** Ya se mostró la sugerencia inicial (sí o no). */
  suggested: boolean;
  /** Completó el playbook al menos una vez. */
  completed: boolean;
};

const DEFAULT: LoginTutorialPrefs = {
  suggested: false,
  completed: false,
};

export function readLoginTutorialPrefs(): LoginTutorialPrefs {
  try {
    const raw = localStorage.getItem(LOGIN_TUTORIAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<LoginTutorialPrefs>;
    return {
      suggested: Boolean(parsed.suggested),
      completed: Boolean(parsed.completed),
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeLoginTutorialPrefs(
  patch: Partial<LoginTutorialPrefs>,
): LoginTutorialPrefs {
  const next = { ...readLoginTutorialPrefs(), ...patch };
  try {
    localStorage.setItem(LOGIN_TUTORIAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

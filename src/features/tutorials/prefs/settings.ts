/** Persistencia local de tutoriales de Configuración. */
export const SETTINGS_TUTORIAL_STORAGE_KEY = "scheduly-tutorial-settings-v1";

export type SettingsTabId =
  | "marca"
  | "sistema"
  | "inventario"
  | "comprobantes"
  | "publico"
  | "locales"
  | "sri"
  | "backups";

export type SettingsTutorialPrefs = {
  /** Ya se ofreció / cerró el tour de pestañas. */
  tabsOverviewSuggested: boolean;
  tabsOverviewCompleted: boolean;
  /** Tabs cuyo tour de contenido ya se mostró o se omitió. */
  tabsSeen: Partial<Record<SettingsTabId, boolean>>;
};

const DEFAULT: SettingsTutorialPrefs = {
  tabsOverviewSuggested: false,
  tabsOverviewCompleted: false,
  tabsSeen: {},
};

export function readSettingsTutorialPrefs(): SettingsTutorialPrefs {
  try {
    const raw = localStorage.getItem(SETTINGS_TUTORIAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT, tabsSeen: {} };
    const parsed = JSON.parse(raw) as Partial<SettingsTutorialPrefs>;
    return {
      tabsOverviewSuggested: Boolean(parsed.tabsOverviewSuggested),
      tabsOverviewCompleted: Boolean(parsed.tabsOverviewCompleted),
      tabsSeen:
        parsed.tabsSeen && typeof parsed.tabsSeen === "object"
          ? { ...parsed.tabsSeen }
          : {},
    };
  } catch {
    return { ...DEFAULT, tabsSeen: {} };
  }
}

export function writeSettingsTutorialPrefs(
  patch: Partial<SettingsTutorialPrefs> & {
    tabsSeen?: Partial<Record<SettingsTabId, boolean>>;
  },
): SettingsTutorialPrefs {
  const prev = readSettingsTutorialPrefs();
  const next: SettingsTutorialPrefs = {
    tabsOverviewSuggested:
      patch.tabsOverviewSuggested ?? prev.tabsOverviewSuggested,
    tabsOverviewCompleted:
      patch.tabsOverviewCompleted ?? prev.tabsOverviewCompleted,
    tabsSeen: {
      ...prev.tabsSeen,
      ...(patch.tabsSeen ?? {}),
    },
  };
  try {
    localStorage.setItem(SETTINGS_TUTORIAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function markSettingsTabSeen(tab: SettingsTabId) {
  return writeSettingsTutorialPrefs({ tabsSeen: { [tab]: true } });
}

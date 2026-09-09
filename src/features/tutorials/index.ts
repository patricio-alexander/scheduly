/**
 * Scheduly tutorials
 *
 * Estructura (reutilizable para guía, demo y corridas reales):
 *
 *   core/          motor driver.js + overlays + tipos
 *   prefs/         localStorage (seen / completed)
 *   definitions/   pasos y catálogos por módulo (sin I/O)
 *   simulation/    modos, demos falsos, secuencias multi-módulo
 *   gates/         providers React (? / auto-start)
 *   lab/           laboratorio programador
 *   hooks/         helpers React transversales
 *
 * Modos: guide | demo | live  →  simulation/modes.ts
 * Playlists: simulation/sequences/
 */

export type {
  TourRunMode,
  TourCatalogEntry,
  TourDefinition,
  TourDemoAdapters,
} from "./core/types";

export { runSchedulyTour } from "./core/run-tour";
export type { SchedulyTourStep, TourDemoAction } from "./core/run-tour";

export {
  TOUR_CLOSE_OVERLAYS_EVENT,
  TOUR_OPEN_OVERLAY_EVENT,
  TOUR_BRANCHES_ACTION_EVENT,
  TOUR_ENTITY_ACTION_EVENT,
  requestTourCloseOverlays,
  requestTourOpenOverlay,
  requestTourBranchesAction,
  requestTourEntityAction,
} from "./core/overlays";
export type {
  TourOverlayId,
  TourEntityAction,
  TourBranchesAction,
} from "./core/overlays";

export { useTourCloseOverlays, useTourOverlays } from "./hooks/useTourCloseOverlays";

export { TUTORIAL_CATALOG, getLoginTourSteps, LOGIN_TOUR_ID } from "./definitions/login";
export {
  getSettingsTabsTourSteps,
  getSettingsTabTourSteps,
  SETTINGS_TABS_TOUR_ID,
  TUTORIAL_SETTINGS_CATALOG,
} from "./definitions/settings";
export {
  getAgendaOverviewTourSteps,
  getAgendaCreateTourSteps,
  AGENDA_OVERVIEW_TOUR_ID,
  AGENDA_CREATE_TOUR_ID,
  TUTORIAL_AGENDA_CATALOG,
} from "./definitions/agenda";
export {
  getBranchesOverviewTourSteps,
  getBranchesFormTourSteps,
  getBranchesTeamTourSteps,
  BRANCHES_OVERVIEW_TOUR_ID,
  BRANCHES_FORM_TOUR_ID,
  BRANCHES_TEAM_TOUR_ID,
  TUTORIAL_BRANCHES_CATALOG,
} from "./definitions/branches";
export {
  getEntityCreateTourSteps,
  getEntityCreateTourId,
  getEntityFormTourSteps,
  getEntityFormTourId,
  ENTITY_CREATE_DEMOS,
  ENTITY_CREATE_TOUR_CONFIGS,
  TUTORIAL_ENTITY_CREATE_CATALOG,
  type EntityCreateModuleId,
} from "./definitions/entity-create";
export {
  MODULE_DRIVER_TOURS,
  findModuleDriverTour,
  getModuleDriverSteps,
} from "./definitions/modules";

export {
  readModuleTutorialPrefs,
  isModuleTourSeen,
  markModuleTourSeen,
} from "./prefs/module";
export {
  readLoginTutorialPrefs,
  writeLoginTutorialPrefs,
} from "./prefs/login";
export {
  readSettingsTutorialPrefs,
  writeSettingsTutorialPrefs,
  type SettingsTabId,
} from "./prefs/settings";

export {
  TOUR_RUN_MODE_LABELS,
  isTourRunMode,
  shouldRunStepDemos,
} from "./simulation/modes";
export {
  BRANCHES_TEAM_DEMO,
  BRANCHES_OVERVIEW_DEMO_BRANCH,
  BRANCHES_OVERVIEW_DEMO_FORM,
} from "./simulation/demos/branches-team";
export { useEntityCreateTourDemo } from "./simulation/hooks/useEntityCreateTourDemo";
export {
  TOUR_SEQUENCES,
  getTourSequence,
  TUTORIAL_SEQUENCES_CATALOG,
} from "./simulation/sequences/registry";
export { runTourSequence } from "./simulation/sequences";
export type {
  TourSequence,
  TourSequenceStep,
  TourSequenceRunnerOptions,
} from "./simulation/sequences/types";

export { LoginTutorialGate } from "./gates/LoginTutorialGate";
export { SettingsTutorialGate } from "./gates/SettingsTutorialGate";
export {
  AgendaTutorialProvider,
  AgendaOverviewHelpButton,
  AgendaCreateHelpButton,
} from "./gates/AgendaTutorialGate";
export {
  BranchesTutorialProvider,
  BranchesOverviewHelpButton,
  BranchesFormHelpButton,
  BranchesTeamHelpButton,
} from "./gates/BranchesTutorialGate";
export {
  EntityCreateTutorialProvider,
  EntityCreateHelpButton,
} from "./gates/EntityCreateTutorialGate";
export {
  ModuleTutorialOrchestrator,
  START_MODULE_TOUR_EVENT,
} from "./gates/ModuleTutorialOrchestrator";

export { TutorialsLabPage } from "./lab/TutorialsLabPage";
export { TutorialsReturnBridge } from "./gates/TutorialsReturnBridge";
export {
  TUTORIAL_HUB_ENTRIES,
  TUTORIAL_HUB_GROUPS,
  tutorialHubEntriesForRole,
} from "./lab/hub-catalog";
export type { TutorialHubEntry } from "./lab/hub-catalog";
export {
  armTutorialsReturn,
  clearTutorialsReturn,
  TUTORIALS_RETURN_KEY,
} from "./simulation/launch";

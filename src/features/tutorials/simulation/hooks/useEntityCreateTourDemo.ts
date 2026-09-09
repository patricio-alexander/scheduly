"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@heroui/react";
import {
  TOUR_ENTITY_ACTION_EVENT,
  type TourEntityAction,
} from "../../core/overlays";

type Options<T> = {
  moduleId: string;
  items: T[];
  buildDemoItem: () => T;
  openCreate: () => void;
  closeModal: () => void;
  /** Mensaje toast al guardar en demo. */
  demoToast?: string;
};

/**
 * Demo de alta de entidad para tours: lista vacía simulada, open/submit vía eventos,
 * sin llamar a la API. Usar con EntityCreateTutorialProvider.
 */
export function useEntityCreateTourDemo<T>({
  moduleId,
  items,
  buildDemoItem,
  openCreate,
  closeModal,
  demoToast = "(Demo) Registro de prueba — no se guardó en el servidor",
}: Options<T>) {
  const demoRef = useRef(false);
  const [override, setOverride] = useState<T[] | null>(null);
  const buildRef = useRef(buildDemoItem);
  buildRef.current = buildDemoItem;
  const openRef = useRef(openCreate);
  openRef.current = openCreate;
  const closeRef = useRef(closeModal);
  closeRef.current = closeModal;

  const displayItems = override ?? items;
  const isTourDemo = useCallback(() => demoRef.current, []);

  const prepareTour = useCallback(() => {
    demoRef.current = true;
    setOverride([]);
    closeRef.current();
  }, []);

  const cleanupTour = useCallback(() => {
    demoRef.current = false;
    setOverride(null);
  }, []);

  const commitDemoCreate = useCallback(() => {
    if (!demoRef.current) return false;
    setOverride([buildRef.current()]);
    closeRef.current();
    toast.success(demoToast);
    return true;
  }, [demoToast]);

  useEffect(() => {
    const onAction = (ev: Event) => {
      const action = (ev as CustomEvent<TourEntityAction>).detail;
      if (!action || action.moduleId !== moduleId) return;
      if (action.type === "open-create") {
        openRef.current();
        return;
      }
      if (action.type === "submit-create") {
        commitDemoCreate();
      }
    };
    window.addEventListener(TOUR_ENTITY_ACTION_EVENT, onAction);
    return () => window.removeEventListener(TOUR_ENTITY_ACTION_EVENT, onAction);
  }, [moduleId, commitDemoCreate]);

  return {
    displayItems,
    override,
    isTourDemo,
    prepareTour,
    cleanupTour,
    commitDemoCreate,
    /** true mientras hay override (incl. lista vacía del tour). */
    tourActive: override !== null,
  };
}

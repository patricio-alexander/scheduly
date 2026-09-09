"use client";

import { useEffect } from "react";
import {
  TOUR_CLOSE_OVERLAYS_EVENT,
  TOUR_OPEN_OVERLAY_EVENT,
  type TourOverlayId,
} from "../core/overlays";

/** Escucha el motor del tour: cerrar todos / abrir uno concreto. */
export function useTourOverlays({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen?: (id: TourOverlayId) => void;
}) {
  useEffect(() => {
    const handleClose = () => onClose();
    const handleOpen = (e: Event) => {
      const id = (e as CustomEvent<{ id?: TourOverlayId }>).detail?.id;
      if (id) onOpen?.(id);
    };
    window.addEventListener(TOUR_CLOSE_OVERLAYS_EVENT, handleClose);
    window.addEventListener(TOUR_OPEN_OVERLAY_EVENT, handleOpen);
    return () => {
      window.removeEventListener(TOUR_CLOSE_OVERLAYS_EVENT, handleClose);
      window.removeEventListener(TOUR_OPEN_OVERLAY_EVENT, handleOpen);
    };
  }, [onClose, onOpen]);
}

/** @deprecated prefer useTourOverlays */
export function useTourCloseOverlays(onClose: () => void) {
  useTourOverlays({ onClose });
}

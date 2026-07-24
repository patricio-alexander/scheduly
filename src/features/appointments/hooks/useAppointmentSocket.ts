"use client";

import { useEffect, useRef } from "react";
import { getClientSocket } from "@/shared/utils/socket-client";
import type { AppointmentCalendarEvent } from "../types";

type AppointmentHandlers = {
  onCreated: (event: AppointmentCalendarEvent) => void;
  onUpdated: (event: AppointmentCalendarEvent) => void;
  onDeleted: (id: string) => void;
};

/** Escucha eventos de turnos vía Socket.io (conexión compartida) */
export function useAppointmentSocket(handlers: AppointmentHandlers, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    const socket = getClientSocket();

    const onCreated = (event: AppointmentCalendarEvent) => {
      handlersRef.current.onCreated(event);
    };
    const onUpdated = (event: AppointmentCalendarEvent) => {
      handlersRef.current.onUpdated(event);
    };
    const onDeleted = (payload: { id: string }) => {
      handlersRef.current.onDeleted(String(payload.id));
    };

    socket.on("appointment:created", onCreated);
    socket.on("appointment:updated", onUpdated);
    socket.on("appointment:deleted", onDeleted);

    return () => {
      socket.off("appointment:created", onCreated);
      socket.off("appointment:updated", onUpdated);
      socket.off("appointment:deleted", onDeleted);
    };
  }, [enabled]);
}

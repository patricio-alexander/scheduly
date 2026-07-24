"use client";

import { useEffect, useRef } from "react";
import { getClientSocket } from "@/shared/utils/socket-client";
import type { Task } from "../types";

type TaskHandlers = {
  onCreated: (task: Task) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: number) => void;
};

/** Escucha eventos de tareas vía Socket.io (conexión compartida) */
export function useTaskSocket(handlers: TaskHandlers, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    const socket = getClientSocket();

    const onCreated = (task: Task) => {
      handlersRef.current.onCreated(task);
    };
    const onUpdated = (task: Task) => {
      handlersRef.current.onUpdated(task);
    };
    const onDeleted = (payload: { id: number }) => {
      handlersRef.current.onDeleted(payload.id);
    };

    socket.on("task:created", onCreated);
    socket.on("task:updated", onUpdated);
    socket.on("task:deleted", onDeleted);

    return () => {
      socket.off("task:created", onCreated);
      socket.off("task:updated", onUpdated);
      socket.off("task:deleted", onDeleted);
    };
  }, [enabled]);
}

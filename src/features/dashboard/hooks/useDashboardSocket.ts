"use client";

import { useEffect, useRef } from "react";
import { getClientSocket } from "@/shared/utils/socket-client";

type Options = {
  /** Se llama al invalidar el dashboard (ya debounced) */
  onInvalidate: () => void;
  enabled?: boolean;
  /** ms de espera para agrupar varios eventos seguidos */
  debounceMs?: number;
};

/**
 * Escucha `dashboard:invalidate` vía Socket.io.
 * No hace polling: solo reacciona a pushes del servidor.
 */
export function useDashboardSocket({
  onInvalidate,
  enabled = true,
  debounceMs = 400,
}: Options) {
  const onInvalidateRef = useRef(onInvalidate);
  onInvalidateRef.current = onInvalidate;

  useEffect(() => {
    if (!enabled) return;

    const socket = getClientSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onInvalidateRef.current();
      }, debounceMs);
    };

    socket.on("dashboard:invalidate", schedule);

    return () => {
      socket.off("dashboard:invalidate", schedule);
      if (timer) clearTimeout(timer);
    };
  }, [enabled, debounceMs]);
}

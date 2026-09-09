"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TUTORIALS_RETURN_EVENT,
  clearTutorialsReturn,
} from "../simulation/launch";

/**
 * Escucha el fin de un tour lanzado desde el hub Tutoriales
 * y vuelve a `/sistema/tutoriales`.
 */
export function TutorialsReturnBridge() {
  const router = useRouter();

  useEffect(() => {
    const onReturn = (ev: Event) => {
      const path = (ev as CustomEvent<{ path?: string }>).detail?.path;
      if (!path) return;
      clearTutorialsReturn();
      // Pequeña pausa para que driver.js limpie el DOM
      window.setTimeout(() => {
        router.push(path);
      }, 180);
    };
    window.addEventListener(TUTORIALS_RETURN_EVENT, onReturn);
    return () => window.removeEventListener(TUTORIALS_RETURN_EVENT, onReturn);
  }, [router]);

  return null;
}

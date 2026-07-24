"use client";

import { Button } from "@heroui/react";
import CircleQuestion from "@gravity-ui/icons/CircleQuestion";
import { useOnboarding } from "../hooks/useOnboarding";

export function ModuleGuidePrompt() {
  const { phase, activeModule, startModuleTour, dismissModulePrompt } =
    useOnboarding();

  if (phase !== "module-prompt" || !activeModule) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[70] w-[min(100vw-2rem,24rem)] -translate-x-1/2 rounded-2xl border border-separator bg-surface p-4 shadow-xl shadow-black/15">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-accent/10 p-2 text-accent">
          <CircleQuestion width={18} height={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            ¿Te muestro {activeModule.label}?
          </p>
          <p className="mt-1 text-xs text-muted">
            Guía rápida de los botones y secciones de esta pantalla.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onPress={() => startModuleTour(activeModule.id)}
            >
              Ver guía
            </Button>
            <Button size="sm" variant="ghost" onPress={dismissModulePrompt}>
              Ahora no
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

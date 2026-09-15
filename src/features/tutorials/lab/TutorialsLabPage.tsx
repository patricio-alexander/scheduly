"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import CirclePlay from "@gravity-ui/icons/CirclePlay";
import DisplayPulse from "@gravity-ui/icons/DisplayPulse";
import Person from "@gravity-ui/icons/Person";
import Persons from "@gravity-ui/icons/Persons";
import PersonWorker from "@gravity-ui/icons/PersonWorker";
import { PageHeader } from "@/shared/components/ui";
import { useAuth } from "@/src/features/auth";
import {
  isOwnerRole,
  isProgrammerRole,
} from "@/shared/utils/roles";
import { appRoutes } from "@/shared/utils/app-routes";
import { apiUrl } from "@/shared/utils/api";
import { START_MODULE_TOUR_EVENT } from "../gates/ModuleTutorialOrchestrator";
import { armTutorialsReturn } from "../simulation/launch";
import type { TourRunMode } from "../core/types";
import {
  TUTORIAL_HUB_GROUPS,
  tutorialHubEntriesForRole,
  type TutorialHubEntry,
} from "./hub-catalog";
import {
  TUTORIAL_SEQUENCES_CATALOG,
  getTourSequence,
} from "../simulation/sequences/registry";
import { runTourSequence } from "../simulation/sequences";

type HubTab = "modules" | "simulation";

const ROLE_SIM_ICONS: Record<string, typeof Persons> = {
  "owner-ops-demo": Persons,
  "admin-ops-demo": PersonWorker,
  "employee-ops-demo": Person,
};

/**
 * Módulo Tutoriales: catálogo de guías por pantalla + simulaciones por rol.
 */
export function TutorialsLabPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isProgrammer = isProgrammerRole(user?.role);
  const isOwner = isOwnerRole(user?.role);
  const canAccess = isProgrammer || isOwner;
  const [hubTab, setHubTab] = useState<HubTab>("modules");
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const entries = useMemo(
    () => tutorialHubEntriesForRole({ isProgrammer }),
    [isProgrammer],
  );

  const byGroup = useMemo(() => {
    const map = new Map<string, TutorialHubEntry[]>();
    for (const g of TUTORIAL_HUB_GROUPS) map.set(g, []);
    for (const e of entries) {
      const list = map.get(e.group) ?? [];
      list.push(e);
      map.set(e.group, list);
    }
    return TUTORIAL_HUB_GROUPS.map((g) => ({
      group: g,
      items: map.get(g) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [entries]);

  const launchEntry = useCallback(
    async (entry: TutorialHubEntry) => {
      setLaunchingId(entry.id);
      armTutorialsReturn(appRoutes.system.tutorials);

      if (entry.id === "login") {
        try {
          await logout();
        } catch {
          /* sigue */
        }
        window.location.assign(apiUrl(entry.route));
        return;
      }

      router.push(entry.route);
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent(START_MODULE_TOUR_EVENT, {
            detail: { mode: "demo" satisfies TourRunMode },
          }),
        );
        setLaunchingId(null);
      }, 750);
    },
    [logout, router],
  );

  const launchSequence = useCallback(
    (sequenceId: string) => {
      const sequence = getTourSequence(sequenceId);
      if (!sequence) return;
      setLaunchingId(sequenceId);
      void runTourSequence({
        sequence,
        navigate: (route) => {
          router.push(route);
        },
        startTour: (tourId) => {
          window.dispatchEvent(
            new CustomEvent(START_MODULE_TOUR_EVENT, {
              detail: tourId ? { tourId, mode: "demo" } : { mode: "demo" },
            }),
          );
        },
        onDone: () => {
          setLaunchingId(null);
          router.push(appRoutes.system.tutorials);
        },
      });
    },
    [router],
  );

  if (!canAccess) {
    return (
      <div className="p-6">
        <PageHeader
          icon={<DisplayPulse width={22} height={22} />}
          title="Tutoriales"
          description="No tenés acceso a este módulo."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader
        icon={<DisplayPulse width={22} height={22} />}
        title="Tutoriales"
        description="Guías paso a paso de cada módulo: abrís la pantalla, seguís el tutorial y volvés acá."
      />

      <div
        role="tablist"
        aria-label="Secciones de tutoriales"
        className="flex flex-wrap gap-2 border-b border-separator pb-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={hubTab === "modules"}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            hubTab === "modules"
              ? "bg-accent/15 text-accent"
              : "text-muted hover:bg-surface hover:text-foreground"
          }`}
          onClick={() => setHubTab("modules")}
        >
          Tutorial por módulo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={hubTab === "simulation"}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            hubTab === "simulation"
              ? "bg-accent/15 text-accent"
              : "text-muted hover:bg-surface hover:text-foreground"
          }`}
          onClick={() => setHubTab("simulation")}
        >
          Simulación de módulos
        </button>
      </div>

      {hubTab === "modules" ? (
        <>
          {byGroup.map(({ group, items }) => (
            <section key={group} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {group}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((entry) => (
                  <article
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-2xl border border-separator bg-surface p-4"
                    data-tour={`tutorials-hub-${entry.id}`}
                  >
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {entry.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {entry.description}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      className="mt-auto gap-2"
                      isDisabled={launchingId === entry.id}
                      onPress={() => void launchEntry(entry)}
                    >
                      <CirclePlay width={16} height={16} />
                      {launchingId === entry.id
                        ? "Abriendo…"
                        : "Ver tutorial"}
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {isProgrammer ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Corridas multi-módulo (dev)
              </h2>
              <p className="text-sm text-muted -mt-1">
                Playlists técnicas; las de capacitación están en Simulación de
                módulos.
              </p>
            </section>
          ) : null}
        </>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Por rol
          </h2>
          <p className="text-sm text-muted -mt-1">
            Historias que cruzan varios módulos. En terminal:{" "}
            <code className="text-xs">npm run sim</code> (día/semana) escribe
            datos reales para verlos en la app.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TUTORIAL_SEQUENCES_CATALOG.map((seq) => {
              const full = getTourSequence(seq.id);
              const Icon = ROLE_SIM_ICONS[seq.id] ?? Persons;
              return (
                <article
                  key={seq.id}
                  className="flex flex-col gap-3 rounded-2xl border border-separator bg-surface p-4"
                  data-tour={`tutorials-hub-sim-${seq.id}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Icon width={18} height={18} />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {seq.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {seq.description}
                      </p>
                      {full ? (
                        <p className="mt-2 text-xs text-muted">
                          {full.steps.map((s) => s.label ?? s.id).join(" → ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    className="mt-auto gap-2"
                    isDisabled={launchingId === seq.id}
                    onPress={() => launchSequence(seq.id)}
                  >
                    <CirclePlay width={16} height={16} />
                    {launchingId === seq.id ? "Corriendo…" : "Correr simulación"}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { Button, Chip } from "@heroui/react";
import Puzzle from "@gravity-ui/icons/Puzzle";
import ArrowRotateLeft from "@gravity-ui/icons/ArrowRotateLeft";
import { PageHeader, Skeleton } from "@/shared/components/ui";
import { apiUrl } from "@/shared/utils/api";
import type { SubscriptionCatalogModule } from "@/shared/utils/subscription-plans";

type ChipColor = NonNullable<ComponentProps<typeof Chip>["color"]>;

function ModulesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-separator bg-surface p-5 shadow-sm"
        >
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-3 h-4 w-24" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}

function statusLabel(status: string | null) {
  if (!status) return null;
  const map: Record<string, string> = {
    active: "Activo",
    development: "En desarrollo",
    maintenance: "Mantenimiento",
    developer: "Developer",
    planned: "Planificado",
  };
  return map[status] ?? status;
}

function statusColor(status: string | null): ChipColor {
  if (!status) return "default";

  const statusMap: Record<string, ChipColor> = {
    active: "success",
    development: "warning",
    maintenance: "danger",
    developer: "accent",
    planned: "default",
  };

  return statusMap[status] ?? "default";
}

export function ModulesList() {
  const [modules, setModules] = useState<SubscriptionCatalogModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/modules"), {
        cache: "no-store",
        credentials: "include",
      });
      const json: unknown = await res.json().catch(() => null);

      
      if (!res.ok) {
        const message =
          json &&
          typeof json === "object" &&
          json !== null &&
          "message" in json &&
          typeof (json as { message: unknown }).message === "string"
            ? (json as { message: string }).message
            : "No se pudieron cargar los módulos";
        throw new Error(message);
      }
      setModules(
        Array.isArray(json) ? (json as SubscriptionCatalogModule[]) : [],
      );
    } catch (e) {
      
      setError(e instanceof Error ? e.message : "Error al cargar módulos");
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          icon={<Puzzle width={24} height={24} />}
          title="Módulos"
          description="Activa o desactiva módulos disponibles en Scheduly"
        />
        <Button
          size="sm"
          variant="secondary"
          isDisabled={loading}
          onPress={() => {
            void load();
          }}
        >
          <ArrowRotateLeft width={14} height={14} />
          Actualizar
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <ModulesSkeleton />
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-separator bg-surface-secondary/40 px-6 py-16 text-center">
          <Puzzle
            width={28}
            height={28}
            className="mx-auto text-muted opacity-50"
          />
          <p className="mt-3 text-sm font-medium">No hay módulos disponibles</p>
          <p className="mt-1 text-xs text-muted">
            Cuando el gestor publique módulos, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((mod, index) => {
            const label = statusLabel(mod.status);
            return (
              <article
                key={mod.id ?? `${mod.key}-${index}`}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-separator bg-surface shadow-sm"
              >
                <div className="border-b border-separator px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 truncate text-lg font-semibold tracking-tight">
                      {mod.name}
                    </h2>
                    {label ? (
                      <Chip
                        color={statusColor(mod.status)}
                        variant="soft"
                        size="sm"
                      >
                        {label}
                      </Chip>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{mod.key}</p>
                </div>
                <div className="flex flex-1 flex-col px-5 py-4">
                  {mod.description ? (
                    <p className="text-sm leading-relaxed text-muted">
                      {mod.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted">Sin descripción</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

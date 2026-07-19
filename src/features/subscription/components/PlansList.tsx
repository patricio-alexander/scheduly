"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import Rocket from "@gravity-ui/icons/Rocket";
import Puzzle from "@gravity-ui/icons/Puzzle";
import ArrowRotateLeft from "@gravity-ui/icons/ArrowRotateLeft";
import { PageHeader, Skeleton } from "@/shared/components/ui";
import { apiUrl } from "@/shared/utils/api";
import type {
  SubscriptionPlan,
  SubscriptionPlanPrice,
} from "@/shared/utils/subscription-plans";

function formatPriceValue(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPrices(prices: SubscriptionPlan["prices"]) {
  const list: SubscriptionPlanPrice[] = Array.isArray(prices)
    ? (prices as SubscriptionPlanPrice[])
    : prices && typeof prices === "object"
      ? [prices as SubscriptionPlanPrice]
      : [];

  if (list.length === 0) return ["Consultar precio"];

  return list.map((price) => {
    if (typeof price === "number" || typeof price === "string") {
      return formatPriceValue(price) ?? String(price);
    }

    const amount =
      formatPriceValue(price.amount) ??
      formatPriceValue(price.price) ??
      (typeof price.label === "string" ? price.label : null);

    const period = String(price.period ?? price.interval ?? "").trim();
    if (amount && period) return `${amount} / ${period}`;
    if (amount) return amount;
    if (period) return period;
    return "Consultar precio";
  });
}

function PlansSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-separator bg-surface p-5 shadow-sm"
        >
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function PlansList() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/plans"), { cache: "no-store" });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          json &&
          typeof json === "object" &&
          json !== null &&
          "message" in json &&
          typeof (json as { message: unknown }).message === "string"
            ? (json as { message: string }).message
            : "No se pudieron cargar los planes";
        throw new Error(message);
      }
      setPlans(Array.isArray(json) ? (json as SubscriptionPlan[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar planes");
      setPlans([]);
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
          icon={<Rocket width={24} height={24} />}
          title="Planes"
          description="Planes disponibles desde el gestor de suscripciones"
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
        <PlansSkeleton />
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-separator bg-surface-secondary/40 px-6 py-16 text-center">
          <Rocket width={28} height={28} className="mx-auto text-muted opacity-50" />
          <p className="mt-3 text-sm font-medium">No hay planes disponibles</p>
          <p className="mt-1 text-xs text-muted">
            Cuando el gestor publique planes, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, planIndex) => {
            const priceLabels = formatPrices(plan.prices);
            return (
              <article
                key={`plan-${planIndex}-${plan.name}`}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-separator bg-surface shadow-sm"
              >
                <div className="border-b border-separator px-5 py-4">
                  <h2 className="truncate text-lg font-semibold tracking-tight">
                    {plan.name}
                  </h2>
                  <div className="mt-2 flex flex-col gap-1">
                    {priceLabels.map((label, priceIndex) => (
                      <p
                        key={`plan-${planIndex}-price-${priceIndex}`}
                        className="text-base font-bold tabular-nums text-accent"
                      >
                        {label}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 px-5 py-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    <Puzzle width={12} height={12} />
                    Módulos incluidos
                  </p>
                  {plan.modules.length === 0 ? (
                    <p className="text-sm text-muted">Sin módulos listados</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {plan.modules.map((mod, moduleIndex) => (
                        <li
                          key={`plan-${planIndex}-module-${moduleIndex}`}
                          className="rounded-xl bg-surface-secondary/60 px-3 py-2"
                        >
                          <p className="text-sm font-medium">{mod.name}</p>
                          {mod.description ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted">
                              {mod.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
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

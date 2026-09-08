"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Calendar from "@gravity-ui/icons/Calendar";
import Gift from "@gravity-ui/icons/Gift";
import { ContentCard, EmptyState } from "@/shared/components/ui";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatDateTime } from "@/shared/utils/datetime-display";

type VisitRow = {
  id: number;
  name: string;
  lastnames: string;
  phone: string | null;
  email: string | null;
  points: number;
  tier: string;
  visitCount: number;
  lastVisitAt: string | null;
  daysSinceLast: number | null;
  avgDaysBetween: number | null;
  suggestion: "gift" | "promo" | "discount" | "reactivate" | "ok";
  suggestionLabel: string;
};

export function VisitFrequencyPanel() {
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/loyalty/visit-frequency"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { customers?: VisitRow[] };
      setRows(Array.isArray(json.customers) ? json.customers : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <ContentCard>
        <div className="p-4 sm:p-6">
          <p className="text-sm text-muted">Analizando frecuencia de visitas…</p>
        </div>
      </ContentCard>
    );
  }

  if (rows.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Calendar width={32} height={32} />}
          title="Sin historial de visitas"
          description="Cuando haya citas completadas, aquí verás quién viene seguido y a quién conviene regalar, descontar o reactivar."
        />
      </ContentCard>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ContentCard>
        <div className="border-b border-separator px-4 py-3 text-sm text-muted">
          Basado en citas del último año. Sirve para decidir <strong>promos</strong>,{" "}
          <strong>descuentos</strong> o <strong>regalos</strong> según qué tan seguido
          viene cada clienta.
        </div>
        <ul className="divide-y divide-separator">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {r.name} {r.lastnames}
                </p>
                <p className="text-xs text-muted">
                  {r.visitCount} visita{r.visitCount === 1 ? "" : "s"}
                  {r.avgDaysBetween != null
                    ? ` · cada ~${r.avgDaysBetween} días`
                    : ""}
                  {r.lastVisitAt
                    ? ` · última ${formatDateTime(r.lastVisitAt)}`
                    : ""}
                  {r.points > 0 ? ` · ${r.points} pts` : ""}
                </p>
                <p className="mt-1 text-sm text-foreground">{r.suggestionLabel}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.suggestion === "gift"
                      ? "bg-accent/15 text-accent"
                      : r.suggestion === "discount"
                        ? "bg-warning/15 text-warning"
                        : r.suggestion === "reactivate"
                          ? "bg-danger/15 text-danger"
                          : r.suggestion === "promo"
                            ? "bg-success/15 text-success"
                            : "bg-surface-secondary text-muted"
                  }`}
                >
                  {r.suggestion === "gift"
                    ? "Regalo"
                    : r.suggestion === "discount"
                      ? "Descuento"
                      : r.suggestion === "reactivate"
                        ? "Reactivar"
                        : r.suggestion === "promo"
                          ? "Promo"
                          : "OK"}
                </span>
                <Link
                  href={`${appRoutes.sales.customers}?q=${encodeURIComponent(r.name)}`}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Ver cliente
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </ContentCard>
      <p className="flex items-center gap-2 px-1 text-xs text-muted">
        <Gift width={14} height={14} />
        Creá la oferta o premio en las pestañas Ofertas / Premios según la sugerencia.
      </p>
    </div>
  );
}

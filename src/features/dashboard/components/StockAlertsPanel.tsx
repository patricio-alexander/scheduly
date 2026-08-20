"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import TriangleExclamation from "@gravity-ui/icons/TriangleExclamation";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import { appRoutes } from "@/shared/utils/app-routes";
import type {
  StockAlertItem,
  StockAlertsBuckets,
} from "@/shared/utils/dashboard-finance-hero";
import { StockGauge } from "./StockGauge";

const VIEWS = [
  { id: "agotados" as const, label: "Agotados", empty: "No hay productos agotados." },
  { id: "critico" as const, label: "≤ mínimo", empty: "Nada en o bajo el mínimo." },
  { id: "bajo" as const, label: "Bajo", empty: "Sin productos en zona baja." },
  { id: "precaucion" as const, label: "Precaución", empty: "Sin productos en precaución." },
];

const GAUGE_SLOTS = 8;

type StockAlertsPanelProps = {
  alerts: StockAlertsBuckets;
};

export function StockAlertsPanel({ alerts }: StockAlertsPanelProps) {
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("agotados");

  const counts = useMemo(
    () => ({
      agotados: alerts.agotados.length,
      critico: alerts.critico.length,
      bajo: alerts.bajo.length,
      precaucion: alerts.precaucion.length,
    }),
    [alerts],
  );

  const preferred = useMemo(() => {
    for (const v of VIEWS) {
      if (counts[v.id] > 0) return v.id;
    }
    return "agotados" as const;
  }, [counts]);

  const activeView = counts[view] > 0 || view === preferred ? view : preferred;
  const items: StockAlertItem[] = alerts[activeView] ?? [];
  const meta = VIEWS.find((v) => v.id === activeView) ?? VIEWS[0];
  const slots = Array.from({ length: GAUGE_SLOTS }, (_, i) => items[i] ?? null);

  return (
    <div className="flex h-full min-h-[18rem] min-w-0 flex-col rounded-2xl border border-separator bg-surface p-4 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <TriangleExclamation width={18} height={18} className="text-warning" />
          <div>
            <h2 className="text-base font-semibold">Alertas de inventario</h2>
            <p className="text-xs text-muted">Velocímetros de stock vs mínimo</p>
          </div>
        </div>
        <Link
          href={appRoutes.inventory.products}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Ver inventario
          <ArrowRight width={12} height={12} />
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => {
          const active = activeView === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-separator text-muted hover:bg-surface-secondary"
              }`}
            >
              {v.label}
              <span
                className={`rounded-full px-1.5 py-0.5 tabular-nums ${
                  active ? "bg-accent text-accent-foreground" : "bg-surface-secondary"
                }`}
              >
                {counts[v.id]}
              </span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <Boxes3 width={28} height={28} className="mb-2 text-muted opacity-40" />
          <p className="text-sm text-muted">{meta.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {slots.map((item, idx) =>
            item ? (
              <div
                key={item.id}
                className="rounded-xl border border-separator bg-surface-secondary/30 p-2"
              >
                <StockGauge
                  compact
                  product={{
                    name: item.name,
                    stock: item.stock,
                    minStock: item.minStock,
                  }}
                  subtitle={item.branchName}
                />
              </div>
            ) : (
              <div
                key={`empty-${idx}`}
                className="hidden rounded-xl border border-dashed border-separator/60 sm:block"
                aria-hidden
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import Calendar from "@gravity-ui/icons/Calendar";
import Gear from "@gravity-ui/icons/Gear";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export type StatusChartEntry = {
  key: string;
  name: string;
  value: number;
  color: string;
};

type AppointmentStatusPieCardProps = {
  statusChartData: StatusChartEntry[];
  totalStatus: number;
  activeStatusKey: string | null;
  onActiveStatusKeyChange: (key: string | null) => void;
  activeStatusEntry: StatusChartEntry | null;
  activeStatusPct: number;
  className?: string;
  periodDescription?: string;
  unitLabel?: string;
};

export function AppointmentStatusPieCard({
  statusChartData,
  totalStatus,
  activeStatusKey,
  onActiveStatusKeyChange,
  activeStatusEntry,
  activeStatusPct,
  className = "",
  periodDescription,
  unitLabel = "turnos",
}: AppointmentStatusPieCardProps) {
  if (statusChartData.length === 0) {
    return (
      <div
        className={`dashboard-card flex h-full min-h-[14rem] min-w-0 flex-col p-4 md:p-5 ${className}`}
        data-onboarding="dash-status"
      >
        <div className="mb-3 flex items-center gap-2">
          <Calendar width={18} height={18} className="text-accent" />
          <div>
            <h2 className="text-base font-semibold">
              {unitLabel === "ventas" ? "Ventas por estado" : "Turnos por estado"}
            </h2>
            <p className="text-xs text-muted">
              Distribución del período
              {periodDescription ? ` · ${periodDescription}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center">
          <Gear width={28} height={28} className="mb-2 text-muted opacity-40" />
          <p className="text-xs text-muted">
            {unitLabel === "ventas" ? "Sin datos de ventas aún" : "Sin datos de turnos aún"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`dashboard-card flex h-full min-w-0 flex-col p-4 md:p-5 ${className}`}
      data-onboarding="dash-status"
    >
      <div className="mb-3 flex items-center gap-2">
        <Calendar width={18} height={18} className="text-accent" />
        <div>
            <h2 className="text-base font-semibold">
              {unitLabel === "ventas" ? "Ventas por estado" : "Turnos por estado"}
            </h2>
          <p className="text-xs text-muted">
            Distribución del período
            {periodDescription ? ` · ${periodDescription}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative h-40 w-40 shrink-0 sm:h-44 sm:w-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={74}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                onMouseEnter={(_, index) =>
                  onActiveStatusKeyChange(statusChartData[index]?.key ?? null)
                }
                onMouseLeave={() => onActiveStatusKeyChange(null)}
              >
                {statusChartData.map((entry) => {
                  const dimmed =
                    activeStatusKey != null && activeStatusKey !== entry.key;
                  const active = activeStatusKey === entry.key;
                  return (
                    <Cell
                      key={entry.key}
                      fill={entry.color}
                      fillOpacity={dimmed ? 0.35 : 1}
                      stroke={active ? "var(--surface)" : "none"}
                      strokeWidth={active ? 3 : 0}
                      style={{
                        outline: "none",
                        cursor: "pointer",
                        transition: "fill-opacity 150ms ease",
                      }}
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
            {activeStatusEntry ? (
              <>
                <span className="text-2xl font-bold tabular-nums leading-none sm:text-3xl">
                  {activeStatusPct}%
                </span>
                <span className="mt-1 max-w-[5.5rem] truncate text-[10px] font-medium text-muted">
                  {activeStatusEntry.name}
                </span>
                <span className="text-[10px] tabular-nums text-muted">
                  {activeStatusEntry.value} {unitLabel}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold tabular-nums leading-none sm:text-3xl">
                  {totalStatus}
                </span>
                <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                  {unitLabel}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

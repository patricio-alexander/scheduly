"use client";

import Person from "@gravity-ui/icons/Person";
import type { DashboardTopEmployee } from "@/shared/utils/dashboard-widgets";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

type TopEmployeesCardProps = {
  employees: DashboardTopEmployee[];
  periodDescription?: string;
  posMode?: boolean;
};

export function TopEmployeesCard({
  employees,
  periodDescription,
  posMode = false,
}: TopEmployeesCardProps) {
  return (
    <div
      className="dashboard-card flex min-h-0 min-w-0 flex-col"
      data-onboarding="dash-top-employees"
    >
      <div className="dashboard-card-header">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Person width={18} height={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {posMode ? "Top vendedores" : "Top empleados"}
            </h2>
            <p className="truncate text-xs text-muted">
              Por ingresos generados
              {periodDescription ? ` · ${periodDescription}` : ""}
            </p>
          </div>
        </div>
      </div>
      {employees.length > 0 ? (
        <ul className="divide-y divide-separator px-4 md:px-5">
          {employees.map((emp, index) => (
            <li
              key={emp.id}
              className="dashboard-list-item -mx-1 flex items-center gap-3 rounded-lg px-1 py-2.5"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  index === 0
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-secondary text-muted"
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{emp.name}</p>
                <p className="text-[11px] text-muted">
                  {emp.appointments}{" "}
                  {posMode
                    ? emp.appointments === 1
                      ? "venta"
                      : "ventas"
                    : emp.appointments === 1
                      ? "turno"
                      : "turnos"}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(emp.revenue)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-xs text-muted">
          {posMode
            ? "Sin ventas cobradas en el período"
            : "Sin turnos completados en el período"}
        </p>
      )}
    </div>
  );
}

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
};

export function TopEmployeesCard({
  employees,
  periodDescription,
}: TopEmployeesCardProps) {
  return (
    <div
      className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-separator bg-surface p-4 md:p-5"
      data-onboarding="dash-top-employees"
    >
      <div className="mb-3 flex items-center gap-2">
        <Person width={18} height={18} className="text-accent" />
        <div>
          <h2 className="text-base font-semibold">Top empleados</h2>
          <p className="text-xs text-muted">
            Por ingresos generados
            {periodDescription ? ` · ${periodDescription}` : ""}
          </p>
        </div>
      </div>
      {employees.length > 0 ? (
        <ul className="divide-y divide-separator">
          {employees.map((emp, index) => (
            <li
              key={emp.id}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
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
                  {emp.appointments === 1 ? "turno" : "turnos"}
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
          Sin turnos completados en el período
        </p>
      )}
    </div>
  );
}

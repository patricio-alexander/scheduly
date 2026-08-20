"use client";

import Link from "next/link";
import Calendar from "@gravity-ui/icons/Calendar";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import { StatusChip } from "@/shared/components/StatusChip";
import { getStatusTone } from "@/shared/utils/appointment-status";
import { appRoutes } from "@/shared/utils/app-routes";
import type { DashboardRecentAppointment } from "@/shared/utils/dashboard-widgets";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    }),
    time: d.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

type RecentAppointmentsCardProps = {
  appointments: DashboardRecentAppointment[];
  periodDescription?: string;
  className?: string;
};

export function RecentAppointmentsCard({
  appointments,
  periodDescription,
  className = "",
}: RecentAppointmentsCardProps) {
  return (
    <div
      className={`flex max-h-[24rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-separator bg-surface md:max-h-[28rem] lg:max-h-[32rem] ${className}`}
      data-onboarding="dash-recent"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-separator px-4 py-3.5 md:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Últimos turnos</h2>
          <p className="text-xs text-muted">
            Actividad reciente
            {periodDescription ? ` · ${periodDescription}` : ""}
          </p>
        </div>
        <Link
          href={appRoutes.operation.agenda}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Ver agenda
          <ArrowRight width={12} height={12} />
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
          <Calendar
            width={28}
            height={28}
            className="mb-2 text-muted opacity-40"
          />
          <p className="text-sm font-medium">Sin turnos recientes</p>
          <Link
            href={appRoutes.operation.agenda}
            className="mt-2 text-xs font-semibold text-accent hover:underline"
          >
            Crear turno
          </Link>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-separator overflow-y-auto">
          {appointments.map((apt) => {
            const { date, time } = formatDateTime(apt.date);
            return (
              <li key={apt.id}>
                <Link
                  href={`${appRoutes.operation.agenda}?appointmentId=${apt.id}`}
                  className="flex min-w-0 items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-surface-secondary/50 md:gap-3 md:px-5"
                >
                  <div
                    className={`h-8 w-1 shrink-0 rounded-full ${getStatusTone(apt.status).dot}`}
                    aria-hidden
                  />
                  <div className="w-14 shrink-0 text-right md:w-20">
                    <p className="text-xs font-semibold tabular-nums">{time}</p>
                    <p className="truncate text-[10px] text-muted">{date}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{apt.customer}</p>
                    <p className="truncate text-xs text-muted">
                      {apt.title}
                      {apt.employee ? ` · ${apt.employee}` : ""}
                    </p>
                  </div>
                  <span className="hidden shrink-0 sm:inline-flex">
                    <StatusChip
                      status={apt.status}
                      size="sm"
                      compact
                      className="max-w-[7rem]"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

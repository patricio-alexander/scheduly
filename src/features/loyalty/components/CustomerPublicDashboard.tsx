"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Calendar from "@gravity-ui/icons/Calendar";
import Clock from "@gravity-ui/icons/Clock";
import Megaphone from "@gravity-ui/icons/Megaphone";
import Percent from "@gravity-ui/icons/Percent";
import Person from "@gravity-ui/icons/Person";
import ShoppingBag from "@gravity-ui/icons/ShoppingBag";
import { appRoutes } from "@/shared/utils/app-routes";
import { fetchCustomerAccount } from "../services/loyalty-service";
import { useCustomerAuth } from "../hooks/useCustomerAuth";
import type { CustomerAppointment } from "../types";

export const CUSTOMER_DASHBOARD_ACTIONS = [
  {
    key: "booking" as const,
    href: appRoutes.booking,
    label: "Reservar",
    description: "Servicio, día y hora",
    icon: Calendar,
  },
  {
    key: "myTurn" as const,
    href: appRoutes.loyalty.myTurn,
    label: "Mi turno",
    description: "Consulta tu cita",
    icon: Clock,
  },
  {
    key: "catalog" as const,
    href: appRoutes.loyalty.publicCatalog,
    label: "Catálogo",
    description: "Productos del local",
    icon: ShoppingBag,
  },
  {
    key: "promos" as const,
    href: appRoutes.loyalty.promos,
    label: "Promos",
    description: "Ofertas activas",
    icon: Percent,
  },
  {
    key: "feed" as const,
    href: appRoutes.loyalty.feed,
    label: "Novedades",
    description: "Premios y avisos",
    icon: Megaphone,
  },
];

export type CustomerDashboardKey =
  (typeof CUSTOMER_DASHBOARD_ACTIONS)[number]["key"];

const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  rescheduled: "Reagendado",
  paid_pending: "Pagado",
  pending_payment: "Por pagar",
  completed: "Completado",
};

function formatTurnWhen(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CustomerPublicDashboard({
  active,
  title = "¿Qué quieres hacer?",
  subtitle = "Reserva, revisa tu turno o mira el catálogo y las novedades.",
  extra,
}: {
  active?: CustomerDashboardKey | "account" | "home";
  title?: string;
  subtitle?: string;
  extra?: ReactNode;
}) {
  const { customer } = useCustomerAuth();
  const customerId = customer?.id ?? null;
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [turnsLoading, setTurnsLoading] = useState(false);

  const loadTurns = useCallback(async () => {
    if (!customerId) {
      setAppointments([]);
      return;
    }
    setTurnsLoading(true);
    try {
      const data = await fetchCustomerAccount();
      setAppointments(data.appointments);
    } catch {
      setAppointments([]);
    } finally {
      setTurnsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTurns(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTurns]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
      <header className="shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Panel
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted">{subtitle}</p>
      </header>

      <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {CUSTOMER_DASHBOARD_ACTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`md-btn flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                isActive
                  ? "border-accent bg-accent/5"
                  : "border-separator bg-surface hover:bg-surface-secondary"
              }`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-foreground">
                <Icon width={16} height={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {customerId ? (
        <section className="shrink-0">
          <h2 className="mb-2 text-sm font-semibold">Tus turnos</h2>
          {turnsLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-surface-secondary" />
          ) : appointments.length === 0 ? (
            <p className="rounded-xl border border-separator bg-surface px-3 py-2.5 text-sm text-muted">
              No tienes turnos próximos.
            </p>
          ) : (
            <ul className="space-y-2">
              {appointments.map((turn) => {
                const serviceNames = turn.services.map((s) => s.name).join(", ");
                return (
                  <li
                    key={turn.id}
                    className="rounded-xl border border-separator bg-surface px-3 py-2.5"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Clock width={14} height={14} className="shrink-0 text-muted" />
                      {formatTurnWhen(turn.appointmentDate)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                      <Person width={14} height={14} className="shrink-0" />
                      {turn.staffName
                        ? `Con ${turn.staffName}`
                        : "Sin profesional asignado"}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted">
                      {serviceNames || turn.title}
                      {turn.branchName ? ` · ${turn.branchName}` : ""}
                      {statusLabel[turn.status]
                        ? ` · ${statusLabel[turn.status]}`
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {extra ? <div className="shrink-0">{extra}</div> : null}
    </section>
  );
}

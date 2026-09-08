"use client";

import { useEffect, useState } from "react";
import Calendar from "@gravity-ui/icons/Calendar";
import Wallet from "@gravity-ui/icons/Wallet";
import { PageHeader } from "@/shared/components/ui";
import { useAuth } from "@/src/features/auth";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { paymentMethodLabel } from "@/shared/utils/payment-methods";
import { StatusChip } from "@/shared/components/StatusChip";

type EmployeeData = {
  todayAppointments: Array<{
    id: number;
    title: string;
    status: string;
    date: string;
    customer: string;
    branch: string | null;
    services: string;
  }>;
  weekAppointments: number;
  commissionTotal: number;
  paidTotal: number;
  commissions: Array<{
    id: number;
    amount: number;
    title: string;
    appointmentDate: string;
  }>;
  salaryPayments: Array<{
    id: number;
    amount: number;
    method: string;
    paidAt: string;
    notes: string;
    branch: string | null;
    registeredBy: string;
  }>;
  stock: Array<{ productName: string; branchName: string; stock: number }>;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function EmployeeMyDayPage() {
  const { user } = useAuth();
  const [data, setData] = useState<EmployeeData | null>(null);

  useEffect(() => {
    void fetch(apiUrl("/api/employee/me"), { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        icon={<Calendar width={24} height={24} />}
        title={`Hola, ${user.name.split(" ")[0]}`}
        description="Tu agenda, comisiones pendientes y pagos de sueldo"
      />

      {!data ? (
        <div className="h-32 animate-pulse rounded-2xl bg-surface-secondary" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-separator bg-surface p-4">
              <p className="text-xs text-muted">Turnos esta semana</p>
              <p className="text-2xl font-bold">{data.weekAppointments}</p>
            </div>
            <div className="rounded-2xl border border-separator bg-surface p-4">
              <p className="text-xs text-muted">Comisiones pendientes</p>
              <p className="text-2xl font-bold tabular-nums text-accent">
                {formatMoney(data.commissionTotal)}
              </p>
            </div>
            <div className="rounded-2xl border border-separator bg-surface p-4">
              <p className="text-xs text-muted">Total pagado a ti</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-600">
                {formatMoney(data.paidTotal)}
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-separator bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wallet width={18} height={18} className="text-accent" />
              <h2 className="font-semibold">Pagos de sueldo recibidos</h2>
            </div>
            {data.salaryPayments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                Aún no tienes pagos de sueldo registrados.
              </p>
            ) : (
              <ul className="divide-y divide-separator">
                {data.salaryPayments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium tabular-nums text-emerald-600">
                        {formatMoney(payment.amount)}
                      </p>
                      <p className="text-sm text-foreground">
                        {formatDateTime(payment.paidAt)}
                      </p>
                      <p className="text-xs text-muted">
                        {paymentMethodLabel[payment.method as keyof typeof paymentMethodLabel] ??
                          payment.method}
                        {payment.branch ? ` · ${payment.branch}` : ""}
                        {payment.registeredBy ? ` · Registrado por ${payment.registeredBy}` : ""}
                      </p>
                      {payment.notes ? (
                        <p className="mt-1 text-xs text-muted">{payment.notes}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.commissions.length > 0 ? (
            <section className="rounded-2xl border border-separator bg-surface p-4">
              <h2 className="mb-3 font-semibold">Comisiones por cobrar</h2>
              <ul className="divide-y divide-separator">
                {data.commissions.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{line.title}</p>
                      <p className="text-xs text-muted">
                        {new Date(line.appointmentDate).toLocaleDateString("es-EC")}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-accent">
                      {formatMoney(line.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-2xl border border-separator bg-surface p-4">
            <h2 className="mb-3 font-semibold">Mi agenda</h2>
            <ul className="divide-y divide-separator">
              {data.todayAppointments.length === 0 ? (
                <li className="py-6 text-center text-sm text-muted">Sin turnos próximos</li>
              ) : (
                data.todayAppointments.map((apt) => (
                  <li key={apt.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{apt.customer}</p>
                      <p className="text-sm text-muted">
                        {new Date(apt.date).toLocaleString("es-EC")} · {apt.branch ?? "—"}
                      </p>
                      <p className="text-xs text-muted">{apt.services}</p>
                    </div>
                    <StatusChip status={apt.status} size="sm" compact />
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-separator bg-surface p-4">
            <h2 className="mb-3 font-semibold">Stock en mi sucursal</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.stock.slice(0, 12).map((row, i) => (
                <li
                  key={`${row.productName}-${i}`}
                  className="rounded-xl bg-surface-secondary/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{row.productName}</span>
                  <span className="text-muted"> · {row.stock} uds · {row.branchName}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

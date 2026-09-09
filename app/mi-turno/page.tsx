"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, toast } from "@heroui/react";
import { PublicShell } from "@/shared/components/PublicShell";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";

type AppointmentRow = {
  id: number;
  title: string;
  status: string;
  appointmentDate: string;
  branchName: string | null;
  staffName: string | null;
  services: Array<{ id: number; name: string; durationMinutes: number }>;
};

const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  rescheduled: "Reagendado",
  paid_pending: "Pagado · pendiente",
  pending_payment: "Pendiente de pago",
  completed: "Completado",
  cancelled: "Cancelado",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MiTurnoPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[] | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setAppointments(null);
    setCustomerName(null);
    try {
      const res = await fetch(apiUrl("/api/public/mi-turno"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
        customer?: { name: string };
        appointments?: AppointmentRow[];
      } | null;
      if (!res.ok) {
        throw new Error(json?.message || "No se pudo consultar");
      }
      setCustomerName(json?.customer?.name ?? null);
      setAppointments(json?.appointments ?? []);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al consultar");
    } finally {
      setPending(false);
    }
  };

  return (
    <PublicShell active="myTurn">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Mi turno</h1>
          <p className="mt-1 text-sm text-muted">
            Consulta tu cita con cédula o correo y la clave que te dio el local.
            No necesitas entrar al panel del personal.
          </p>
        </header>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-4 rounded-2xl border border-separator bg-surface p-5"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Cédula o correo</span>
            <input
              required
              autoComplete="username"
              className="rounded-xl border border-separator bg-field-background px-3 py-2.5 text-field-foreground"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="0102030405 o correo@…"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Clave del portal</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="rounded-xl border border-separator bg-field-background px-3 py-2.5 text-field-foreground"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <Button type="submit" variant="primary" isDisabled={pending}>
            {pending ? "Consultando…" : "Ver mi turno"}
          </Button>
        </form>

        {appointments ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              {customerName ? `Hola, ${customerName}` : "Tus citas"}
            </h2>
            {appointments.length === 0 ? (
              <p className="rounded-2xl border border-separator bg-surface p-4 text-sm text-muted">
                No hay turnos próximos registrados.
              </p>
            ) : (
              appointments.map((a) => (
                <article
                  key={a.id}
                  className="rounded-2xl border border-accent/30 bg-accent/5 p-4"
                >
                  <p className="text-sm font-semibold">{formatWhen(a.appointmentDate)}</p>
                  <p className="mt-1 text-sm">{a.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {statusLabel[a.status] ?? a.status}
                    {a.branchName ? ` · ${a.branchName}` : ""}
                    {a.staffName ? ` · ${a.staffName}` : ""}
                  </p>
                  {a.services.length ? (
                    <ul className="mt-2 text-xs text-muted">
                      {a.services.map((s) => (
                        <li key={s.id}>
                          {s.name}
                          {s.durationMinutes
                            ? ` · ${s.durationMinutes} min`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))
            )}
          </section>
        ) : null}

        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link href={appRoutes.booking} className="text-accent hover:underline">
            Reservar
          </Link>
          <Link
            href={appRoutes.loyalty.publicCatalog}
            className="text-accent hover:underline"
          >
            Catálogo
          </Link>
          <Link
            href={appRoutes.loyalty.promos}
            className="text-accent hover:underline"
          >
            Promos
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}

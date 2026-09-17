"use client";

import Calendar from "@gravity-ui/icons/Calendar";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import House from "@gravity-ui/icons/House";
import Person from "@gravity-ui/icons/Person";
import type { EventClickArg } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { AlertDialog, Button, toast } from "@heroui/react";
import { useCallback, useEffect, useState } from "react";
import { StatusChip } from "@/shared/components/StatusChip";
import { apiUrl } from "@/shared/utils/api";
import { statusCalendarClass } from "@/shared/utils/appointment-status";
import { branchDisplayLabel } from "@/shared/utils/auth-user";
import { formatMoney } from "@/shared/utils/money";
import { paymentMethodLabel } from "@/shared/utils/payment-methods";
import {
  hasEmployeeExperience,
  isPureEmployeeRole,
  roleLabel,
} from "@/shared/utils/roles";
import { LoginForm, useAuth } from "@/src/features/auth";
import { ProfileForm, type ProfileData } from "@/src/features/profile";
import { usePaymentRequestSocket } from "../hooks/usePaymentRequestSocket";
import {
  acceptMobilePayment,
  getMobileEmployeeCalendar,
  getMobileEmployeeData,
  getMobileEmployeeProfile,
  getMobilePaymentRequests,
  rejectMobilePayment,
  updateMobileEmployeeProfile,
} from "../services/mobile-employee-service";
import type {
  MobileCalendarEvent,
  MobileEmployeeData,
  MobilePaymentRequest,
  MobileTab,
} from "../types";

const tabs: Array<{
  id: MobileTab;
  label: string;
  icon: typeof House;
}> = [
  { id: "home", label: "Inicio", icon: House },
  { id: "agenda", label: "Agenda", icon: Calendar },
  { id: "commissions", label: "Comisiones", icon: CircleDollar },
  { id: "profile", label: "Perfil", icon: Person },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPayrollDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function EmployeeLogin() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <section className="w-full max-w-sm rounded-3xl border border-separator bg-surface p-7 shadow-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-3xl font-extrabold text-primary-foreground">
            S
          </div>
          <h1 className="text-2xl font-bold">Scheduly Mobile</h1>
          <p className="mt-1 text-sm text-muted">
            Ingresa con tu cuenta de empleado
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg bg-background p-5">
      <div className="mb-5 h-16 animate-pulse rounded-2xl bg-surface-secondary" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-surface-secondary"
          />
        ))}
      </div>
    </main>
  );
}

function HomeTab({ data }: { data: MobileEmployeeData }) {
  const nextAppointment = data.todayAppointments[0];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3">
        <article className="rounded-2xl bg-primary p-4 text-primary-foreground">
          <Calendar width={20} height={20} />
          <p className="mt-4 text-3xl font-bold">{data.weekAppointments}</p>
          <p className="text-xs opacity-80">Turnos esta semana</p>
        </article>
        <article className="rounded-2xl border border-separator bg-surface p-4">
          <CircleDollar width={20} height={20} className="text-success" />
          <p className="mt-4 text-xl font-bold text-success">
            {formatMoney(data.commissionTotal)}
          </p>
          <p className="text-xs text-muted">Por cobrar</p>
        </article>
      </section>

      <section className="rounded-2xl border border-separator bg-surface p-4">
        <h2 className="font-semibold">Próximo turno</h2>
        {nextAppointment ? (
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{nextAppointment.customer}</p>
              <p className="text-sm text-muted">
                {formatDateTime(nextAppointment.date)}
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {nextAppointment.services || nextAppointment.title}
              </p>
            </div>
            <StatusChip
              status={nextAppointment.status}
              size="sm"
              compact
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No tienes turnos próximos.</p>
        )}
      </section>

      <section className="rounded-2xl border border-separator bg-surface p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted">Total de últimos pagos</p>
            <p className="text-2xl font-bold">
              {formatMoney(data.paidTotal)}
            </p>
          </div>
          <span className="text-xs text-muted">
            {data.salaryPayments.length} pagos
          </span>
        </div>
      </section>
    </div>
  );
}

function AgendaTab({ events }: { events: MobileCalendarEvent[] }) {
  const [selectedEvent, setSelectedEvent] =
    useState<MobileCalendarEvent | null>(null);

  const selectEvent = (info: EventClickArg) => {
    setSelectedEvent(
      events.find((event) => event.id === info.event.id) ?? null,
    );
  };

  return (
    <section>
      <h2 className="text-xl font-bold">Mi agenda</h2>
      <p className="mb-4 text-sm text-muted">
        Cambia entre mes, semana o día y toca un turno para ver sus detalles.
      </p>

      <div className="mobile-fullcalendar overflow-hidden rounded-2xl border border-separator bg-surface p-2">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          events={events.map((event) => ({
            id: event.id,
            title: event.extendedProps.customer || event.title,
            start: event.start,
            classNames: [
              statusCalendarClass[event.extendedProps.status] ??
                "apt-status-scheduled",
            ],
          }))}
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: "today",
          }}
          footerToolbar={{
            center: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
          }}
          height="auto"
          contentHeight="auto"
          dayMaxEvents={2}
          displayEventTime
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          scrollTime="08:00:00"
          allDaySlot={false}
          nowIndicator
          stickyHeaderDates
          eventClick={selectEvent}
        />
      </div>

      {selectedEvent ? (
        <article className="mt-4 rounded-2xl border border-separator bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">
                {selectedEvent.extendedProps.customer}
              </p>
              <p className="text-sm text-muted">
                {formatDateTime(selectedEvent.start)}
              </p>
            </div>
            <StatusChip
              status={selectedEvent.extendedProps.status}
              size="sm"
              compact
            />
          </div>
          <p className="mt-3 text-sm">{selectedEvent.title}</p>
          {selectedEvent.extendedProps.description ? (
            <p className="mt-1 text-xs text-muted">
              {selectedEvent.extendedProps.description}
            </p>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

function CommissionsTab({ data }: { data: MobileEmployeeData }) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-muted">Comisiones pendientes</p>
        <p className="text-3xl font-bold text-success">
          {formatMoney(data.commissionTotal)}
        </p>
        <ul className="mt-4 space-y-2">
          {data.commissions.length ? (
            data.commissions.map((commission) => (
              <li
                key={commission.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-separator bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{commission.title}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(commission.appointmentDate)}
                    {commission.ratePct
                      ? ` · ${commission.ratePct}%`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-success">
                  {formatMoney(commission.amount)}
                </span>
              </li>
            ))
          ) : (
            <li className="rounded-2xl border border-dashed border-separator p-6 text-center text-sm text-muted">
              No tienes comisiones pendientes.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Pagos recibidos</h2>
        <ul className="mt-3 space-y-2">
          {data.salaryPayments.map((payment) => (
            <li
              key={payment.id}
              className="rounded-2xl bg-surface-secondary p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  {payment.periodStart && payment.periodEnd ? (
                    <>
                      <p className="text-sm font-semibold">
                        Liquidación semanal
                      </p>
                      <p className="text-xs text-muted">
                        Semana del {formatPayrollDate(payment.periodStart)} al{" "}
                        {formatPayrollDate(payment.periodEnd)}
                      </p>
                    </>
                  ) : null}
                  <p className="text-sm font-medium">
                    {paymentMethodLabel[
                      payment.method as keyof typeof paymentMethodLabel
                    ] ?? payment.method}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(payment.paidAt)}
                  </p>
                </div>
                <span className="font-bold">
                  {formatMoney(payment.amount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ProfileTab({
  profile,
  onSave,
  onLogout,
}: {
  profile: ProfileData;
  onSave: (data: FormData | Partial<ProfileData>) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold">Mi perfil</h2>
      <p className="mb-4 text-sm text-muted">Información personal y contacto</p>
      <div className="rounded-2xl border border-separator bg-surface p-4">
        <ProfileForm profile={profile} onSave={onSave} />
      </div>
      <Button
        className="mt-5"
        variant="danger"
        fullWidth
        onPress={() => void onLogout()}
      >
        Cerrar sesión
      </Button>
    </section>
  );
}

function PaymentRequestDialog({
  request,
  pending,
  onAccept,
  onReject,
}: {
  request: MobilePaymentRequest | null;
  pending: boolean;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialog.Backdrop isOpen={Boolean(request)}>
        <AlertDialog.Container placement="center">
          <AlertDialog.Dialog className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
            <AlertDialog.Header>
              <AlertDialog.Icon status="success" />
              <AlertDialog.Heading>Confirma tu pago</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {request ? (
                <div className="space-y-3">
                  <p>
                    Administración informa que te pagará{" "}
                    <strong>{formatMoney(request.amount)}</strong> por tu
                    liquidación semanal.
                  </p>
                  <div className="rounded-2xl bg-surface-secondary p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Semana correspondiente
                    </p>
                    <p className="mt-1 font-semibold">
                      Del {formatPayrollDate(request.periodStart)}
                      <br />
                      al {formatPayrollDate(request.periodEnd)}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-success">
                      {formatMoney(request.amount)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {paymentMethodLabel[
                        request.method as keyof typeof paymentMethodLabel
                      ] ?? request.method}
                      {request.branchName ? ` · ${request.branchName}` : ""}
                    </p>
                    {request.notes ? (
                      <p className="mt-2 text-sm">{request.notes}</p>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted">
                    Al aceptar confirmas que recibiste este pago.
                  </p>
                </div>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                variant="danger"
                isDisabled={pending}
                onPress={() => void onReject()}
              >
                Rechazar pago
              </Button>
              <Button
                variant="primary"
                isDisabled={pending}
                onPress={() => void onAccept()}
              >
                {pending ? "Confirmando..." : "Confirmar recibido"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

function AuthenticatedMobileApp() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [data, setData] = useState<MobileEmployeeData | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<MobileCalendarEvent[]>(
    [],
  );
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [paymentRequest, setPaymentRequest] =
    useState<MobilePaymentRequest | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const handleRealtimePaymentRequest = useCallback(
    (request: MobilePaymentRequest) => setPaymentRequest(request),
    [],
  );

  usePaymentRequestSocket(
    handleRealtimePaymentRequest,
    user && isPureEmployeeRole(user.role) ? user.id : null,
  );

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    void Promise.all([
      getMobileEmployeeData(),
      getMobileEmployeeProfile(user.id),
      getMobileEmployeeCalendar(),
    ])
      .then(([employeeData, employeeProfile, events]) => {
        if (cancelled) return;
        setData(employeeData);
        setProfile(employeeProfile);
        setCalendarEvents(events);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar tu información",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isPureEmployeeRole(user.role)) return;

    let cancelled = false;
    const checkPaymentRequests = async () => {
      try {
        const requests = await getMobilePaymentRequests();
        if (cancelled) return;

        const next = requests[0] ?? null;
        if (!next) {
          setPaymentRequest(null);
        } else {
          setPaymentRequest(next);
        }
      } catch {
        // La carga principal ya muestra errores; el sondeo no interrumpe la app.
      }
    };

    void checkPaymentRequests();
    const timer = window.setInterval(() => {
      void checkPaymentRequests();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user]);

  const confirmPayment = useCallback(async () => {
    if (!paymentRequest) return;

    setConfirmingPayment(true);
    try {
      await acceptMobilePayment(paymentRequest.lineId);
      const refreshed = await getMobileEmployeeData();
      setData(refreshed);
      setPaymentRequest(null);
      toast.success("Pago confirmado correctamente");
    } catch (reason) {
      toast.danger(
        reason instanceof Error
          ? reason.message
          : "No se pudo confirmar el pago",
      );
    } finally {
      setConfirmingPayment(false);
    }
  }, [paymentRequest]);

  const rejectPayment = useCallback(async () => {
    if (!paymentRequest) return;

    setConfirmingPayment(true);
    try {
      await rejectMobilePayment(paymentRequest.lineId);
      setPaymentRequest(null);
      toast.success("Pago rechazado");
    } catch (reason) {
      toast.danger(
        reason instanceof Error
          ? reason.message
          : "No se pudo rechazar el pago",
      );
    } finally {
      setConfirmingPayment(false);
    }
  }, [paymentRequest]);

  const saveProfile = useCallback(
    async (value: FormData | Partial<ProfileData>) => {
      if (!user) return;
      try {
        const updated = await updateMobileEmployeeProfile(user.id, value);
        setProfile(updated);
        toast.success("Perfil actualizado");
      } catch (reason) {
        const message =
          reason instanceof Error
            ? reason.message
            : "No se pudo actualizar el perfil";
        toast.danger(message);
        throw reason;
      }
    },
    [user],
  );

  if (!user) return null;

  if (!hasEmployeeExperience(user.role)) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <section className="w-full max-w-sm rounded-3xl border border-separator bg-surface p-6 text-center">
          <h1 className="text-xl font-bold">Acceso para empleados</h1>
          <p className="mt-2 text-sm text-muted">
            Tu rol actual no tiene acceso a la aplicación móvil.
          </p>
          <Button
            className="mt-6"
            variant="primary"
            onPress={() => void logout()}
          >
            Cerrar sesión
          </Button>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <p className="text-danger">{error}</p>
          <Button
            className="mt-4"
            variant="primary"
            onPress={() => window.location.reload()}
          >
            Reintentar
          </Button>
        </div>
      </main>
    );
  }

  if (!data || !profile) return <LoadingScreen />;

  const branch = branchDisplayLabel(user.branch, user.role);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-background">
      <header className="sticky top-0 z-20 border-b border-separator bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              {roleLabel(user.role)}
              {branch ? ` · ${branch}` : ""}
            </p>
            <h1 className="truncate text-xl font-bold">
              Hola, {user.name.split(" ")[0]}
            </h1>
          </div>
          <button
            type="button"
            className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-primary-foreground"
            onClick={() => setActiveTab("profile")}
            aria-label="Abrir perfil"
          >
            {user.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={apiUrl(user.photo)}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              user.name.slice(0, 1).toUpperCase()
            )}
          </button>
        </div>
      </header>

      <main className="px-5 pb-28 pt-5">
        {activeTab === "home" ? <HomeTab data={data} /> : null}
        {activeTab === "agenda" ? (
          <AgendaTab events={calendarEvents} />
        ) : null}
        {activeTab === "commissions" ? (
          <CommissionsTab data={data} />
        ) : null}
        {activeTab === "profile" ? (
          <ProfileTab
            profile={profile}
            onSave={saveProfile}
            onLogout={logout}
          />
        ) : null}
      </main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-lg border-t border-separator bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={selected ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors ${
                selected
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon width={21} height={21} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <PaymentRequestDialog
        request={paymentRequest}
        pending={confirmingPayment}
        onAccept={confirmPayment}
        onReject={rejectPayment}
      />
    </div>
  );
}

export function MobileEmployeeApp() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <EmployeeLogin />;

  return <AuthenticatedMobileApp key={user.id} />;
}

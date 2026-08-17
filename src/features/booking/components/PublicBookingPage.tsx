"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  Label,
  SearchField,
  toast,
} from "@heroui/react";
import {
  getLocalTimeZone,
  today,
  type CalendarDate,
} from "@internationalized/date";
import CalendarIcon from "@gravity-ui/icons/Calendar";
import Clock from "@gravity-ui/icons/Clock";
import ArrowLeft from "@gravity-ui/icons/ArrowLeft";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import ArrowDownToLine from "@gravity-ui/icons/ArrowDownToLine";
import Check from "@gravity-ui/icons/Check";
import { PublicShell } from "@/shared/components/PublicShell";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatDurationLabel } from "@/shared/utils/booking";
import { formatMoney } from "@/shared/utils/money";
import { CustomerLoginForm, useCustomerAuth } from "@/src/features/loyalty";

import { openReservationTicket } from "../lib/reservation-ticket";
import {
  DEFAULT_BUSINESS_NAME,
  DEFAULT_THEME_COLORS,
  type BusinessProfile,
} from "@/shared/utils/business-profile";

type BookingService = {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
};

type BookingBranch = {
  id: number;
  name: string;
  address: string;
  code: string;
};

type BookingStaff = {
  id: number;
  name: string;
};

type Step = "services" | "schedule" | "done";

type Confirmation = {
  appointmentId: number;
  appointmentDate: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
};

const STEPS: { id: Step; label: string }[] = [
  { id: "services", label: "Servicio" },
  { id: "schedule", label: "Horario" },
];

function formatSlotLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function stepIndex(step: Step) {
  const i = STEPS.findIndex((s) => s.id === step);
  return i < 0 ? STEPS.length : i;
}


export function PublicBookingPage() {
  const minDate = today(getLocalTimeZone());
  const { customer, loading: authLoading } = useCustomerAuth();
  const [services, setServices] = useState<BookingService[]>([]);
  const [branches, setBranches] = useState<BookingBranch[]>([]);
  const [staff, setStaff] = useState<BookingStaff[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("services");
  const [selected, setSelected] = useState<BookingService | null>(null);
  const [date, setDate] = useState<CalendarDate>(() =>
    today(getLocalTimeZone()),
  );
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [business, setBusiness] = useState<BusinessProfile>({
    businessName: DEFAULT_BUSINESS_NAME,
    address: "",
    logoPath: null,
    ruc: "",
    tradeName: "",
    obligationAccounting: true,
    ...DEFAULT_THEME_COLORS,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/settings"), { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as BusinessProfile | null;
        if (!cancelled && res.ok && json) {
          setBusiness({
            businessName: json.businessName || DEFAULT_BUSINESS_NAME,
            address: json.address ?? "",
            logoPath: json.logoPath ?? null,
            ruc: json.ruc ?? "",
            tradeName: json.tradeName ?? "",
            obligationAccounting: json.obligationAccounting ?? true,
            accentColor: json.accentColor ?? DEFAULT_THEME_COLORS.accentColor,
            successColor: json.successColor ?? DEFAULT_THEME_COLORS.successColor,
            warningColor: json.warningColor ?? DEFAULT_THEME_COLORS.warningColor,
            dangerColor: json.dangerColor ?? DEFAULT_THEME_COLORS.dangerColor,
          });
        }
      } catch {
        // defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(apiUrl("/api/booking/services"), {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(json)) {
          throw new Error(
            typeof json?.message === "string"
              ? json.message
              : "No se pudieron cargar los servicios",
          );
        }
        if (!cancelled) setServices(json);
      } catch (e) {
        if (!cancelled) {
          setServices([]);
          setLoadError(
            e instanceof Error ? e.message : "Error al cargar servicios",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/booking/branches"), { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && Array.isArray(json)) {
          setBranches(json);
          if (json.length === 1) setSelectedBranchId(json[0].id);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedBranchId) {
      setStaff([]);
      setSelectedStaffId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/booking/staff?branchId=${selectedBranchId}`),
          { cache: "no-store" },
        );
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && Array.isArray(json)) {
          setStaff(json);
          setSelectedStaffId(null);
        }
      } catch {
        if (!cancelled) setStaff([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBranchId]);

  const loadSlots = useCallback(
    async (serviceId: number, day: string, branchId: number | null, userId: number | null) => {
      setSlotsLoading(true);
      setSlot(null);
      try {
        const params = new URLSearchParams({
          serviceId: String(serviceId),
          date: day,
        });
        if (branchId) params.set("branchId", String(branchId));
        if (userId) params.set("userId", String(userId));
        const res = await fetch(apiUrl(`/api/booking/slots?${params.toString()}`), {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        setSlots(Array.isArray(json?.slots) ? json.slots : []);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (step !== "schedule" || !selected) return;
    void loadSlots(selected.id, date.toString(), selectedBranchId, selectedStaffId);
  }, [step, selected, date, selectedBranchId, selectedStaffId, loadSlots]);

  const currentStep = stepIndex(step);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return services;
    return services.filter((service) => service.name.toLowerCase().includes(q));
  }, [services, serviceSearch]);

  const dateLabel = useMemo(() => {
    if (!slot) return null;
    return new Date(slot).toLocaleString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [slot]);

  const startReserve = (service: BookingService) => {
    setSelected(service);
    setDate(today(getLocalTimeZone()));
    setSlot(null);
    setStep("schedule");
  };

  const goDetails = () => {
    if (!selectedBranchId) {
      toast.danger("Selecciona una sucursal");
      return;
    }
    if (!slot) {
      toast.danger("Selecciona un horario");
      return;
    }
    void submit();
  };

  const submit = async () => {
    if (!selected || !slot || !customer) return;
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/booking"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceId: selected.id,
          branchId: selectedBranchId,
          userId: selectedStaffId,
          appointmentDate: slot,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof json?.message === "string"
            ? json.message
            : "No se pudo crear la reserva",
        );
      }
      const customerName = `${customer.name} ${customer.lastnames}`.trim();
      setConfirmation({
        appointmentId: Number(json.id),
        appointmentDate: json.appointmentDate,
        serviceName: selected.name,
        servicePrice: selected.price,
        durationMinutes: selected.durationMinutes ?? 30,
        customerName,
        customerPhone: customer.phone,
        customerEmail: customer.email,
      });
      setStep("done");
      toast.success("Cita agendada");
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al reservar");
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setSelected(null);
    setSlot(null);
    setSelectedBranchId(branches.length === 1 ? branches[0]?.id ?? null : null);
    setSelectedStaffId(null);
    setConfirmation(null);
    setServiceSearch("");
    setStep("services");
  };

  const goBack = () => {
    if (step === "schedule") {
      setSelected(null);
      setSlot(null);
      setServiceSearch("");
      setStep("services");
    }
  };

  if (authLoading) {
    return (
      <PublicShell active="booking">
        <div className="mx-auto w-full max-w-xl px-4 py-10">
          <div className="h-48 animate-pulse rounded-2xl bg-surface-secondary" />
        </div>
      </PublicShell>
    );
  }

  if (!customer) {
    return (
      <PublicShell active="booking">
        <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6 sm:py-14">
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Reservar
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
              Inicia sesión con tu cuenta de cliente para agendar un turno.
            </p>
          </header>
          <div className="rounded-2xl border border-separator bg-surface p-5">
            <CustomerLoginForm redirectHint="Necesitas una cuenta activa del local para reservar." />
          </div>
          <p className="mt-4 text-center text-sm text-muted">
            <Link href={appRoutes.loyalty.customerPortal} className="text-accent hover:underline">
              Ir a Mi cuenta
            </Link>
          </p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell active="booking">
      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Reservar
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
            Hola {customer.name}. Elige servicio y horario.
          </p>
        </header>

        {step !== "done" ? (
          <ol className="mb-8 flex items-center gap-2">
            {STEPS.map((s, i) => {
              const done = currentStep > i;
              const active = currentStep === i;
              return (
                <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      done || active
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-secondary text-muted"
                    }`}
                  >
                    {done ? <Check width={14} height={14} /> : i + 1}
                  </div>
                  <span
                    className={`truncate text-xs font-medium sm:text-sm ${
                      active ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <span className="ml-auto hidden h-px flex-1 bg-separator sm:block" />
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}

        {step !== "services" && step !== "done" ? (
          <button
            type="button"
            onClick={goBack}
            className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft width={14} height={14} />
            Volver
          </button>
        ) : null}

        {step === "services" ? (
          <section>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[72px] animate-pulse rounded-2xl bg-surface-secondary"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-separator bg-surface px-6 py-10 text-center">
                <p className="text-sm font-medium">No se pudieron cargar</p>
                <p className="mt-1 text-xs text-muted">{loadError}</p>
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-separator bg-surface px-6 py-12 text-center">
                <CalendarIcon
                  width={28}
                  height={28}
                  className="mx-auto text-muted opacity-50"
                />
                <p className="mt-3 text-sm font-medium">
                  No hay servicios disponibles
                </p>
                <p className="mt-1 text-xs text-muted">
                  El administrador aún no ha registrado servicios.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <SearchField value={serviceSearch} onChange={setServiceSearch}>
                  <Label className="sr-only">Buscar servicio</Label>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input
                      className="w-full"
                      placeholder="Buscar servicio..."
                    />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>

                {filteredServices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-separator bg-surface px-6 py-10 text-center">
                    <p className="text-sm font-medium">
                      No se encontraron servicios
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Prueba con otro nombre o limpia la búsqueda.
                    </p>
                  </div>
                ) : (
                  <ul className="overflow-hidden rounded-2xl border border-separator bg-surface">
                    {filteredServices.map((service, index) => (
                      <li
                        key={service.id}
                        className={
                          index > 0 ? "border-t border-separator" : undefined
                        }
                      >
                        <button
                          type="button"
                          onClick={() => startReserve(service)}
                          className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-accent/10 sm:px-5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold tracking-tight text-foreground">
                              {service.name}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                              <Clock width={13} height={13} className="shrink-0" />
                              {formatDurationLabel(service.durationMinutes ?? 30)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {formatMoney(service.price)}
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-muted transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                              <ArrowRight width={14} height={14} />
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        ) : null}

        {step === "schedule" && selected ? (
          <section className="space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-separator pb-4">
              <div className="min-w-0">
                <p className="font-semibold tracking-tight">{selected.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatDurationLabel(selected.durationMinutes)} ·{" "}
                  {formatMoney(selected.price)}
                </p>
              </div>
            </div>

            {branches.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Sucursal</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {branches.map((branch) => {
                    const active = selectedBranchId === branch.id;
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => setSelectedBranchId(branch.id)}
                        className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                          active
                            ? "border-accent bg-accent/10"
                            : "border-separator bg-surface hover:bg-surface-secondary"
                        }`}
                      >
                        <span className="font-medium">{branch.name}</span>
                        {branch.address ? (
                          <span className="mt-1 block text-xs text-muted">{branch.address}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {selectedBranchId && staff.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Profesional (opcional)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStaffId(null)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      selectedStaffId == null
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-secondary text-foreground hover:bg-accent/20"
                    }`}
                  >
                    Cualquiera
                  </button>
                  {staff.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedStaffId(member.id)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        selectedStaffId === member.id
                          ? "bg-accent text-accent-foreground"
                          : "bg-surface-secondary text-foreground hover:bg-accent/20"
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label>Día</Label>
              <DatePicker
                name="booking-date"
                className="w-full"
                value={date}
                minValue={minDate}
                onChange={(d) => {
                  if (!d) return;
                  setDate(d);
                }}
              >
                <DateField.Group fullWidth>
                  <DateField.Input>
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                  <DateField.Suffix>
                    <DatePicker.Trigger>
                      <DatePicker.TriggerIndicator />
                    </DatePicker.Trigger>
                  </DateField.Suffix>
                </DateField.Group>
                <DatePicker.Popover>
                  <Calendar aria-label="Fecha de la cita">
                    <Calendar.Header>
                      <Calendar.YearPickerTrigger>
                        <Calendar.YearPickerTriggerHeading />
                        <Calendar.YearPickerTriggerIndicator />
                      </Calendar.YearPickerTrigger>
                      <Calendar.NavButton slot="previous" />
                      <Calendar.NavButton slot="next" />
                    </Calendar.Header>
                    <Calendar.Grid>
                      <Calendar.GridHeader>
                        {(day) => (
                          <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                        )}
                      </Calendar.GridHeader>
                      <Calendar.GridBody>
                        {(cellDate) => <Calendar.Cell date={cellDate} />}
                      </Calendar.GridBody>
                    </Calendar.Grid>
                    <Calendar.YearPickerGrid>
                      <Calendar.YearPickerGridBody>
                        {({ year }) => <Calendar.YearPickerCell year={year} />}
                      </Calendar.YearPickerGridBody>
                    </Calendar.YearPickerGrid>
                  </Calendar>
                </DatePicker.Popover>
              </DatePicker>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Horario</p>
              {slotsLoading ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-xl bg-surface-secondary"
                    />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">
                  No hay horarios libres este día. Prueba otra fecha.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => {
                    const active = slot === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSlot(s)}
                        className={`rounded-xl px-3 py-2.5 text-sm font-medium tabular-nums transition-colors ${
                          active
                            ? "bg-accent text-accent-foreground"
                            : "bg-surface-secondary text-foreground hover:bg-accent/20"
                        }`}
                      >
                        {formatSlotLabel(s)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              className="w-full"
              isDisabled={!slot || pending}
              onPress={goDetails}
            >
              {pending ? "Agendando..." : "Confirmar cita"}
            </Button>
          </section>
        ) : null}

        {step === "done" && confirmation ? (
          <section className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Check width={28} height={28} />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight">
              Cita agendada
            </h2>
            <p className="mt-3 text-sm font-medium text-foreground">
              {confirmation.serviceName}
            </p>
            <p className="mt-1 text-sm capitalize text-muted">
              {new Date(confirmation.appointmentDate).toLocaleString("es-CL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="primary"
                onPress={() => {
                  try {
                    openReservationTicket({
                      appointmentId: confirmation.appointmentId,
                      serviceName: confirmation.serviceName,
                      servicePrice: confirmation.servicePrice,
                      durationMinutes: confirmation.durationMinutes,
                      appointmentDate: confirmation.appointmentDate,
                      customerName: confirmation.customerName,
                      customerPhone: confirmation.customerPhone,
                      customerEmail: confirmation.customerEmail,
                      businessName: business.businessName,
                      businessAddress: business.address,
                      logoPath: business.logoPath,
                    });
                  } catch (e) {
                    toast.danger(
                      e instanceof Error
                        ? e.message
                        : "No se pudo abrir el ticket",
                    );
                  }
                }}
              >
                <ArrowDownToLine width={16} height={16} />
                Descargar ticket
              </Button>
              <Button variant="secondary" onPress={reset}>
                Agendar otra
              </Button>
              <Link href={appRoutes.home}>
                <Button variant="secondary" className="w-full sm:w-auto">
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </PublicShell>
  );
}

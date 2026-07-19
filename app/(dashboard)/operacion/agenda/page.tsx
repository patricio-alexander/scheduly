"use client";

import { apiUrl } from "@/shared/utils/api";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/src/features/auth";
import {
  Button,
  Modal,
  useOverlayState,
  ComboBox,
  Input,
  Label,
  ListBox,
  DatePicker,
  DateField,
  Calendar,
  TimeField,
  toast,
} from "@heroui/react";
import { parseDate, parseTime, today, getLocalTimeZone, type CalendarDate } from "@internationalized/date";
import type { TimeValue } from "react-aria-components";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type { EventContentArg } from "@fullcalendar/core";
import CalendarIcon from "@gravity-ui/icons/Calendar";
import { PageHeader } from "@/shared/components/ui";
import { StatusChip } from "@/shared/components/StatusChip";
import { StatusLegend } from "@/shared/components/StatusLegend";
import { statusCalendarClass, statusLabel, appointmentStatusOptions } from "@/shared/utils/appointment-status";
import Plus from "@gravity-ui/icons/Plus";
import Person from "@gravity-ui/icons/Person";
import Clock from "@gravity-ui/icons/Clock";
import Envelope from "@gravity-ui/icons/Envelope";
import Smartphone from "@gravity-ui/icons/Smartphone";
import CreditCard from "@gravity-ui/icons/CreditCard";
import { paymentMethodLabel, paymentMethodOptions, type PaymentMethodValue } from "@/shared/utils/payment-methods";
import { formatMoney, lineTotal, toAmount, toQuantity } from "@/shared/utils/money";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    description: string;
    customer: string;
    user: string;
    status: string;
  };
}

interface CustomerOption {
  id: number;
  name: string;
  lastnames: string;
}

interface ServiceOption {
  id: number;
  name: string;
  price: number;
}

interface ProductOption {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface AppointmentPayment {
  id: number;
  amount: number;
  method: PaymentMethodValue;
  paidAt: string;
  notes: string;
}

interface AppointmentDetail {
  id: number;
  title: string;
  description: string;
  appointmentDate: string;
  status: string;
  stockDeducted?: boolean;
  customer: {
    id: number;
    name: string;
    lastnames: string;
    phone: string;
    email: string;
  };
  user: { id: number; name: string };
  services: Array<{ service: ServiceOption }>;
  products?: Array<{ quantity: number; product: ProductOption }>;
  payment?: AppointmentPayment | null;
}

const appointmentSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

function getLocalDateKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatAppointmentDate(isoDate: string) {
  const date = new Date(isoDate);
  return {
    date: date.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  };
}

function calcSelectionTotal(
  catalog: Array<{ id: number; price: unknown }> | null | undefined,
  selectedIds: number[] = [],
) {
  if (!Array.isArray(catalog)) return 0;
  return catalog
    .filter((item) => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + toAmount(item.price), 0);
}

function calcProductsTotal(
  catalog: ProductOption[] | null | undefined,
  selected: Record<number, number>,
) {
  if (!Array.isArray(catalog)) return 0;
  return Object.entries(selected).reduce((sum, [id, qty]) => {
    const item = catalog.find((p) => p.id === Number(id));
    return sum + (item ? lineTotal(item.price, qty) : 0);
  }, 0);
}

function normalizeAppointmentDetail(data: AppointmentDetail): AppointmentDetail {
  return {
    ...data,
    services: data.services.map(({ service }) => ({
      service: {
        ...service,
        price: toAmount(service.price),
      },
    })),
    products: (data.products ?? []).map((line) => ({
      quantity: toQuantity(line.quantity),
      product: {
        ...line.product,
        price: toAmount(line.product.price),
        stock: toAmount(line.product.stock),
      },
    })),
    payment: data.payment
      ? { ...data.payment, amount: toAmount(data.payment.amount) }
      : data.payment,
  };
}

async function fetchCatalog<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

function parseEventTitle(fullTitle: string) {
  const sep = fullTitle.indexOf(" - ");
  if (sep === -1) return { title: fullTitle, customer: "" };
  return {
    title: fullTitle.slice(0, sep),
    customer: fullTitle.slice(sep + 3),
  };
}

function CalendarEventContent({ arg }: { arg: EventContentArg }) {
  const { event, timeText, view } = arg;
  const parsed = parseEventTitle(event.title);
  const customer = String(event.extendedProps.customer ?? parsed.customer);
  const title = parsed.title;
  const professional = String(event.extendedProps.user ?? "");
  const isTimeGrid = view.type.startsWith("timeGrid");

  if (isTimeGrid) {
    return (
      <div className="fc-event-custom fc-event-custom--timegrid">
        <div className="fc-event-custom__header">
          {timeText ? <span className="fc-event-custom__time-badge">{timeText}</span> : null}
          <span className="fc-event-custom__title">{title}</span>
        </div>
        {(customer || professional) && (
          <div className="fc-event-custom__details">
            {customer ? <span className="fc-event-custom__detail">{customer}</span> : null}
            {professional ? <span className="fc-event-custom__detail">{professional}</span> : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fc-event-custom fc-event-custom--month">
      <div className="fc-event-custom__header">
        {timeText ? <span className="fc-event-custom__time-badge">{timeText}</span> : null}
        <span className="fc-event-custom__title">{title}</span>
      </div>
      {customer ? <p className="fc-event-custom__subtitle">{customer}</p> : null}
    </div>
  );
}

function ModalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
}

function MetaCard({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-surface-secondary/70 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium leading-snug">{children}</div>
    </div>
  );
}

function LineItemRow({
  name,
  detail,
  amount,
}: {
  name: string;
  detail?: string;
  amount: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        {detail ? <p className="text-xs text-muted">{detail}</p> : null}
      </div>
      <span className="shrink-0 tabular-nums font-medium">{amount}</span>
    </li>
  );
}

export default function AgendaPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailData, setDetailData] = useState<AppointmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"detail" | "create" | "edit" | "dayList">("detail");
  const [selectedDayDate, setSelectedDayDate] = useState<string>("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [creating, setCreating] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const modal = useOverlayState();
  const [selectedDate, setSelectedDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [selectedTime, setSelectedTime] = useState<TimeValue>(parseTime("09:00"));
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, number>>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("scheduled");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paying, setPaying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const closeModal = useCallback(() => {
    modal.close();
    setSelectedEvent(null);
    setDetailData(null);
    setDetailLoading(false);
    setSelectedDayDate("");
  }, [modal]);

  const openCreate = useCallback((dateStr?: string) => {
    const date = dateStr ? parseDate(dateStr.slice(0, 10)) : today(getLocalTimeZone());
    setSelectedDate(date);
    setSelectedTime(parseTime("09:00"));
    setSelectedEvent({
      id: "",
      title: "",
      start: date.toString(),
      extendedProps: { description: "", customer: "", user: "", status: "scheduled" },
    });
    reset({ title: "", description: "" });
    setSelectedServiceIds([]);
    setSelectedProducts({});
    setSelectedCustomerId("");
    setSelectedStatus("scheduled");
    setSelectedDayDate("");
    setViewMode("create");
    modal.open();
  }, [modal, reset]);

  const applyAppointmentToForm = useCallback((data: AppointmentDetail) => {
    const datePart = data.appointmentDate.slice(0, 10);
    const timePart = data.appointmentDate.slice(11, 16);
    setSelectedDate(parseDate(datePart));
    setSelectedTime(parseTime(timePart));
    reset({
      title: data.title,
      description: data.description,
    });
    setSelectedServiceIds(data.services.map((s) => s.service.id));
    const productMap: Record<number, number> = {};
    for (const line of data.products ?? []) {
      productMap[line.product.id] = toQuantity(line.quantity);
    }
    setSelectedProducts(productMap);
    setSelectedCustomerId(String(data.customer.id));
    setSelectedStatus(data.status);
  }, [reset]);

  const fetchEvents = useCallback(() => {
    fetch(apiUrl("/api/appointments"))
      .then((res) => res.json())
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchCatalog<CustomerOption>(apiUrl("/api/customers")).then(setCustomers);
    fetchCatalog<ServiceOption>(apiUrl("/api/services")).then(setServices);
    fetchCatalog<ProductOption>(apiUrl("/api/products")).then(setProducts);
  }, []);

  const openAppointmentDetail = async (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDayDate(getLocalDateKey(event.start));
    setViewMode("detail");
    setDetailData(null);
    setDetailLoading(true);
    modal.open();
    try {
      const res = await fetch(apiUrl(`/api/appointments/${event.id}`));
      if (res.ok) {
        setDetailData(normalizeAppointmentDetail(await res.json()));
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEventClick = async (info: { event: { id: string; title: string; start: Date | null; extendedProps: Record<string, unknown> } }) => {
    const e = info.event;
    await openAppointmentDetail({
      id: e.id,
      title: e.title,
      start: e.start?.toISOString() ?? "",
      extendedProps: e.extendedProps as CalendarEvent["extendedProps"],
    });
  };

  const handleDateClick = (info: { dateStr: string }) => {
    setSelectedDayDate(info.dateStr.slice(0, 10));
    setSelectedEvent(null);
    setDetailData(null);
    setViewMode("dayList");
    modal.open();
  };

  const getEventsForDay = useCallback(
    (day: string) =>
      events
        .filter((e) => getLocalDateKey(e.start) === day)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [events],
  );

  const formatDayLabel = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const handleEdit = async () => {
    if (!selectedEvent?.id) return;
    if (detailData?.id === Number(selectedEvent.id)) {
      applyAppointmentToForm(detailData);
      setViewMode("edit");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/appointments/${selectedEvent.id}`));
      if (!res.ok) return;
      const data: AppointmentDetail = await res.json();
      setDetailData(normalizeAppointmentDetail(data));
      applyAppointmentToForm(data);
      setViewMode("edit");
    } catch {
      // ignore
    }
  };

  const toggleService = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const getProductStockForForm = (product: ProductOption) => {
    if (viewMode === "edit" && detailData) {
      const existing = detailData.products?.find((line) => line.product.id === product.id);
      if (existing) return product.stock + existing.quantity;
    }
    return product.stock;
  };

  const addProduct = (id: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const available = getProductStockForForm(product);
    if (available <= 0) return;
    setSelectedProducts((prev) => {
      const current = prev[id] ?? 0;
      if (current >= available) return prev;
      return { ...prev, [id]: current + 1 };
    });
  };

  const decrementProduct = (id: number) => {
    setSelectedProducts((prev) => {
      const current = prev[id] ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: current - 1 };
    });
  };

  const incrementProduct = (id: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const available = getProductStockForForm(product);
    setSelectedProducts((prev) => {
      const current = prev[id] ?? 0;
      if (current === 0 || current >= available) return prev;
      return { ...prev, [id]: current + 1 };
    });
  };

  const selectedProductsCount = Object.keys(selectedProducts).length;
  const selectedServicesTotal = calcSelectionTotal(services, selectedServiceIds);
  const selectedProductsTotal = calcProductsTotal(products, selectedProducts);
  const selectedGrandTotal = selectedServicesTotal + selectedProductsTotal;

  const detailTotal = detailData
    ? detailData.services.reduce((sum, { service }) => sum + toAmount(service.price), 0) +
      (detailData.products?.reduce(
        (sum, { product, quantity }) => sum + lineTotal(product.price, quantity),
        0,
      ) ?? 0)
    : 0;

  const handleRegisterPayment = async () => {
    if (!detailData?.id) return;
    setPaying(true);
    try {
      const res = await fetch(apiUrl(`/api/appointments/${detailData.id}/payment`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: paymentMethod,
          amount: detailTotal,
          notes: paymentNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.danger(err.message ?? "Error al registrar el pago");
        return;
      }
      toast.success("Pago registrado y turno cerrado");
      const detailRes = await fetch(apiUrl(`/api/appointments/${detailData.id}`));
      if (detailRes.ok) {
        setDetailData(normalizeAppointmentDetail(await detailRes.json()));
      }
      fetchEvents();
    } catch {
      toast.danger("Error al registrar el pago");
    } finally {
      setPaying(false);
    }
  };

  const onSubmit = async (data: AppointmentFormData) => {
    if (!user) return;
    if (!selectedCustomerId) {
      toast.danger("Selecciona un cliente");
      return;
    }
    setCreating(true);
    const isEdit = viewMode === "edit" && selectedEvent?.id;
    try {
      const dateStr = `${selectedDate.toString()}T${selectedTime.toString()}`;
      const payload = {
        ...data,
        customerId: Number(selectedCustomerId),
        userId: user.id,
        appointmentDate: dateStr,
        serviceIds: selectedServiceIds,
        products: Object.entries(selectedProducts).map(([productId, quantity]) => ({
          productId: Number(productId),
          quantity,
        })),
        status: selectedStatus,
      };
      const res = await fetch(apiUrl(isEdit ? `/api/appointments/${selectedEvent.id}` : "/api/appointments"), {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.danger(err.message ?? "Error al guardar el turno");
        return;
      }
      toast.success(isEdit ? "Turno actualizado" : "Turno creado");
      closeModal();
      fetchEvents();
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col gap-4 sm:h-[calc(100dvh-4rem)] sm:gap-6">
      <div className="shrink-0">
        <PageHeader
        icon={<CalendarIcon width={24} height={24} />}
        title="Agenda"
        description="Visualiza y gestiona los turnos de tu negocio"
        action={
          <Button variant="primary" onPress={() => openCreate()}>
            <Plus width={16} height={16} />
            Agendar turno
          </Button>
        }
      />
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-separator bg-surface p-4 shadow-sm">
        <StatusLegend className="mb-4 shrink-0 border-b border-separator pb-4" />
        <div className="agenda-calendar min-h-0 flex-1">
          {loading ? (
            <p className="text-muted">Cargando agenda...</p>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={events}
              locale={esLocale}
              height="100%"
              dayMaxEvents={3}
              displayEventTime
              eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
              eventDisplay="block"
              stickyHeaderDates
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              scrollTime="08:00:00"
              expandRows={false}
              allDaySlot={false}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              eventContent={(arg) => <CalendarEventContent arg={arg} />}
              eventClassNames={(arg) => {
                const status = String(arg.event.extendedProps.status ?? "scheduled");
                return [statusCalendarClass[status] ?? statusCalendarClass.scheduled];
              }}
            />
          )}
        </div>
      </div>

      <Modal state={modal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center" size="lg" scroll="inside">
            <Modal.Dialog className="!max-w-2xl">
              <Modal.CloseTrigger />

              {/* ── Turnos del día ── */}
              {viewMode === "dayList" && selectedDayDate && (
                <>
                  <Modal.Header>
                    <Modal.Icon>
                      <CalendarIcon width={20} height={20} />
                    </Modal.Icon>
                    <Modal.Heading className="capitalize">
                      {formatDayLabel(selectedDayDate)}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    {(() => {
                      const dayEvents = getEventsForDay(selectedDayDate);
                      if (dayEvents.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <CalendarIcon width={36} height={36} className="text-muted opacity-40 mb-3" />
                            <p className="font-medium">Sin turnos este día</p>
                            <p className="text-sm text-muted mt-1">
                              Puedes agendar uno nuevo para esta fecha
                            </p>
                          </div>
                        );
                      }
                      return (
                        <ul className="flex max-h-[min(60vh,24rem)] flex-col gap-2 overflow-y-auto">
                          {dayEvents.map((event) => {
                            const time = new Date(event.start).toLocaleTimeString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            const title = event.title.split(" - ")[0];
                            return (
                              <li key={event.id}>
                                <button
                                  type="button"
                                  onClick={() => openAppointmentDetail(event)}
                                  className="w-full text-left rounded-xl border border-separator bg-surface-secondary/50 p-3 hover:border-accent/50 hover:bg-surface-secondary transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{title}</p>
                                      <p className="text-sm text-muted mt-0.5 truncate">
                                        {event.extendedProps.customer}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                      <span className="text-sm font-medium tabular-nums">{time}</span>
                                      <StatusChip status={event.extendedProps.status} />
                                    </div>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    })()}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onPress={closeModal}>Cerrar</Button>
                    <Button variant="primary" onPress={() => openCreate(selectedDayDate)}>
                      <Plus width={16} height={16} />
                      Agendar turno
                    </Button>
                  </Modal.Footer>
                </>
              )}

              {/* ── Detalle ── */}
              {viewMode === "detail" && selectedEvent && (
                <>
                  <Modal.Header>
                    <Modal.Icon>
                      <CalendarIcon width={20} height={20} />
                    </Modal.Icon>
                    <Modal.Heading>
                      {detailData?.title ?? selectedEvent.title.split(" - ")[0]}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    {detailLoading ? (
                      <p className="text-muted py-10 text-center text-sm">Cargando detalles del turno...</p>
                    ) : detailData ? (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between gap-3">
                          <StatusChip status={detailData.status} />
                          <span className="text-xs text-muted">Turno #{detailData.id}</span>
                        </div>

                        <ModalSection title="Cliente">
                          <div className="rounded-xl border border-separator bg-surface-secondary/40 p-4">
                            <p className="text-base font-semibold">
                              {detailData.customer.name} {detailData.customer.lastnames}
                            </p>
                            <div className="mt-2 flex flex-col gap-1.5">
                              {detailData.customer.phone && (
                                <div className="flex items-center gap-2 text-sm text-muted">
                                  <Smartphone width={14} height={14} className="shrink-0" />
                                  <span>{detailData.customer.phone}</span>
                                </div>
                              )}
                              {detailData.customer.email && (
                                <div className="flex items-center gap-2 text-sm text-muted">
                                  <Envelope width={14} height={14} className="shrink-0" />
                                  <span>{detailData.customer.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </ModalSection>

                        <ModalSection title="Información del turno">
                          <div className="grid gap-2 sm:grid-cols-3">
                            <MetaCard icon={<CalendarIcon width={12} height={12} />} label="Fecha">
                              <span className="capitalize">
                                {formatAppointmentDate(detailData.appointmentDate).date}
                              </span>
                            </MetaCard>
                            <MetaCard icon={<Clock width={12} height={12} />} label="Hora">
                              {formatAppointmentDate(detailData.appointmentDate).time} hrs
                            </MetaCard>
                            <MetaCard icon={<Person width={12} height={12} />} label="Profesional">
                              {detailData.user.name}
                            </MetaCard>
                          </div>
                          {detailData.description ? (
                            <p className="rounded-xl border border-separator bg-surface-secondary/40 p-3 text-sm text-muted whitespace-pre-wrap">
                              {detailData.description}
                            </p>
                          ) : null}
                        </ModalSection>

                        {(detailData.services.length > 0 || (detailData.products?.length ?? 0) > 0) && (
                          <ModalSection title="Resumen">
                            <div className="divide-y divide-separator rounded-xl border border-separator bg-surface-secondary/40 px-4">
                              {detailData.services.length > 0 && (
                                <ul className="py-2">
                                  {detailData.services.map(({ service }) => (
                                    <LineItemRow
                                      key={service.id}
                                      name={service.name}
                                      detail="Servicio"
                                      amount={formatMoney(service.price)}
                                    />
                                  ))}
                                </ul>
                              )}
                              {(detailData.products?.length ?? 0) > 0 && (
                                <ul className="py-2">
                                  {(detailData.products ?? []).map(({ product, quantity }) => {
                                    const qty = toQuantity(quantity);
                                    return (
                                      <LineItemRow
                                        key={product.id}
                                        name={product.name}
                                        detail={qty > 1 ? `Producto · ×${qty}` : "Producto"}
                                        amount={formatMoney(lineTotal(product.price, qty))}
                                      />
                                    );
                                  })}
                                </ul>
                              )}
                              <div className="flex items-center justify-between py-3 text-base font-semibold">
                                <span>Total</span>
                                <span className="tabular-nums">{formatMoney(detailTotal)}</span>
                              </div>
                            </div>
                          </ModalSection>
                        )}

                        {detailData.payment ? (
                          <ModalSection title="Pago registrado">
                            <div className="grid gap-2 sm:grid-cols-3">
                              <MetaCard icon={<CreditCard width={12} height={12} />} label="Monto">
                                {formatMoney(detailData.payment.amount)}
                              </MetaCard>
                              <MetaCard icon={<CreditCard width={12} height={12} />} label="Método">
                                {paymentMethodLabel[detailData.payment.method]}
                              </MetaCard>
                              <MetaCard icon={<CalendarIcon width={12} height={12} />} label="Fecha">
                                {new Date(detailData.payment.paidAt).toLocaleString("es-CL")}
                              </MetaCard>
                            </div>
                            {detailData.payment.notes ? (
                              <p className="text-sm text-muted">{detailData.payment.notes}</p>
                            ) : null}
                          </ModalSection>
                        ) : detailData.status !== "cancelled" && detailData.status !== "completed" ? (
                          <ModalSection title="Cierre de turno">
                            <div className="flex flex-col gap-4 rounded-xl border border-separator bg-surface-secondary/40 p-4">
                              <p className="text-sm text-muted">
                                Registra el pago para completar el turno y descontar stock de productos.
                              </p>
                              <ComboBox
                                selectedKey={paymentMethod}
                                onSelectionChange={(key) =>
                                  setPaymentMethod((key as PaymentMethodValue) ?? "cash")
                                }
                                variant="secondary"
                              >
                                <Label className="text-sm font-medium">Método de pago</Label>
                                <ComboBox.InputGroup>
                                  <Input />
                                  <ComboBox.Trigger />
                                </ComboBox.InputGroup>
                                <ComboBox.Popover>
                                  <ListBox>
                                    {paymentMethodOptions.map((key) => (
                                      <ListBox.Item key={key} id={key} textValue={paymentMethodLabel[key]}>
                                        {paymentMethodLabel[key]}
                                        <ListBox.ItemIndicator />
                                      </ListBox.Item>
                                    ))}
                                  </ListBox>
                                </ComboBox.Popover>
                              </ComboBox>
                              <div className="flex flex-col gap-1">
                                <label htmlFor="payment-notes" className="text-sm font-medium">
                                  Notas (opcional)
                                </label>
                                <textarea
                                  id="payment-notes"
                                  rows={2}
                                  value={paymentNotes}
                                  onChange={(e) => setPaymentNotes(e.target.value)}
                                  placeholder="Referencia, vuelto, etc."
                                  className="resize-none rounded-xl border border-separator bg-field-background px-3 py-2 text-sm text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
                                />
                              </div>
                              <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 font-semibold">
                                <span>Total a cobrar</span>
                                <span className="tabular-nums">{formatMoney(detailTotal)}</span>
                              </div>
                              <Button
                                variant="primary"
                                onPress={handleRegisterPayment}
                                isDisabled={paying || detailTotal <= 0}
                                isPending={paying}
                                className="w-full"
                              >
                                Registrar pago y cerrar turno
                              </Button>
                            </div>
                          </ModalSection>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Person width={16} height={16} className="text-muted shrink-0" />
                          <span>{selectedEvent.extendedProps.customer}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon width={16} height={16} className="text-muted shrink-0" />
                          <span>{new Date(selectedEvent.start).toLocaleString("es-CL")}</span>
                        </div>
                        <StatusChip status={selectedEvent.extendedProps.status} />
                      </div>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    {selectedDayDate && (
                      <Button variant="secondary" onPress={() => setViewMode("dayList")}>
                        Volver al día
                      </Button>
                    )}
                    <Button variant="secondary" onPress={closeModal}>Cerrar</Button>
                    <Button variant="primary" onPress={handleEdit} isDisabled={detailLoading}>
                      Editar
                    </Button>
                  </Modal.Footer>
                </>
              )}

              {/* ── Crear / Editar ── */}
              {(viewMode === "create" || viewMode === "edit") && selectedEvent && (
                <form
                  ref={formRef}
                  onSubmit={handleSubmit(onSubmit, (formErrors) => {
                    const first = Object.values(formErrors)[0];
                    toast.danger(first?.message?.toString() ?? "Completa los campos requeridos");
                  })}
                  className="contents"
                >
                  <Modal.Header>
                    <Modal.Icon>
                      <CalendarIcon width={20} height={20} />
                    </Modal.Icon>
                    <Modal.Heading>{viewMode === "edit" ? "Editar turno" : "Nuevo turno"}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <div className="flex flex-col gap-6">
                      <ModalSection title="Datos del turno">
                        <div className="flex flex-col gap-4 rounded-xl border border-separator bg-surface-secondary/40 p-4">
                          <div className="flex flex-col gap-1">
                            <label htmlFor="apt-title" className="text-sm font-medium">Título</label>
                            <input
                              id="apt-title"
                              placeholder="Corte de cabello"
                              className="rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
                              {...register("title")}
                            />
                            {errors.title && (
                              <p className="text-danger text-sm">{String(errors.title.message ?? "")}</p>
                            )}
                          </div>

                          <ComboBox
                            selectedKey={selectedCustomerId}
                            onSelectionChange={(key) => setSelectedCustomerId(String(key ?? ""))}
                            variant="secondary"
                          >
                            <Label className="text-sm font-medium">Cliente</Label>
                            <ComboBox.InputGroup>
                              <Input placeholder="Buscar cliente..." />
                              <ComboBox.Trigger />
                            </ComboBox.InputGroup>
                            <ComboBox.Popover>
                              <ListBox>
                                {customers.map((c) => (
                                  <ListBox.Item
                                    key={String(c.id)}
                                    id={String(c.id)}
                                    textValue={`${c.name} ${c.lastnames}`}
                                  >
                                    {c.name} {c.lastnames}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </ComboBox.Popover>
                          </ComboBox>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="flex flex-col gap-1">
                              <Label>Fecha</Label>
                              <DatePicker
                                value={selectedDate}
                                onChange={(d) => {
                                  if (!d) return;
                                  setSelectedDate(d);
                                  setSelectedEvent((prev) =>
                                    prev ? { ...prev, start: d.toString() } : prev
                                  );
                                }}
                                className="w-full"
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
                                  <Calendar aria-label="Event date">
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
                                        {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                                      </Calendar.GridHeader>
                                      <Calendar.GridBody>
                                        {(date) => <Calendar.Cell date={date} />}
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

                            <div className="flex flex-col gap-1">
                              <Label>Hora</Label>
                              <TimeField
                                value={selectedTime}
                                onChange={(t) => t && setSelectedTime(t)}
                                className="w-full"
                              >
                                <TimeField.Group fullWidth>
                                  <TimeField.Input>
                                    {(segment) => <TimeField.Segment segment={segment} />}
                                  </TimeField.Input>
                                </TimeField.Group>
                              </TimeField>
                            </div>

                            <div className="flex flex-col gap-1">
                              <ComboBox
                                selectedKey={selectedStatus}
                                onSelectionChange={(key) => setSelectedStatus(String(key ?? "scheduled"))}
                                variant="secondary"
                              >
                                <Label className="text-sm font-medium">Estado</Label>
                                <ComboBox.InputGroup>
                                  <Input />
                                  <ComboBox.Trigger />
                                </ComboBox.InputGroup>
                                <ComboBox.Popover>
                                  <ListBox>
                                    {appointmentStatusOptions.map((key) => (
                                      <ListBox.Item key={key} id={key} textValue={statusLabel[key]}>
                                        {statusLabel[key]}
                                        <ListBox.ItemIndicator />
                                      </ListBox.Item>
                                    ))}
                                  </ListBox>
                                </ComboBox.Popover>
                              </ComboBox>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label htmlFor="apt-description" className="text-sm font-medium">
                              Descripción
                            </label>
                            <textarea
                              id="apt-description"
                              rows={3}
                              placeholder="Detalles del turno..."
                              className="resize-none rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
                              {...register("description")}
                            />
                          </div>
                        </div>
                      </ModalSection>

                      <ModalSection title="Servicios">
                        {services.length === 0 ? (
                          <p className="text-muted text-sm">No hay servicios disponibles</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 rounded-xl border border-separator bg-surface-secondary/40 p-3">
                            {services.map((s) => {
                              const selected = selectedServiceIds.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => toggleService(s.id)}
                                  className={`rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                                    selected
                                      ? "border-accent bg-accent text-accent-foreground"
                                      : "border-separator bg-field-background text-field-foreground hover:border-accent"
                                  }`}
                                >
                                  {s.name} — {formatMoney(s.price)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </ModalSection>

                      <ModalSection title="Productos">
                        {products.length === 0 ? (
                          <p className="text-muted text-sm">No hay productos disponibles</p>
                        ) : (
                          <div className="flex max-h-52 flex-col gap-2 overflow-y-auto rounded-xl border border-separator bg-surface-secondary/40 p-3">
                            {products.map((p) => {
                              const qty = selectedProducts[p.id] ?? 0;
                              const selected = qty > 0;
                              const available = getProductStockForForm(p);
                              const outOfStock = available <= 0;
                              const atMax = qty >= available;
                              return (
                                <div
                                  key={p.id}
                                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                                    selected
                                      ? "border-accent bg-accent/5"
                                      : outOfStock
                                        ? "border-transparent opacity-60"
                                        : available <= 5
                                          ? "border-warning/40 bg-field-background"
                                          : "border-transparent bg-field-background"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{p.name}</p>
                                    <p className="text-xs text-muted">
                                      {formatMoney(p.price)} ·{" "}
                                      {outOfStock ? "sin stock" : `stock: ${available}`}
                                    </p>
                                  </div>
                                  {selected ? (
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => decrementProduct(p.id)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-separator bg-surface text-sm hover:border-accent"
                                        aria-label="Disminuir cantidad"
                                      >
                                        −
                                      </button>
                                      <span className="w-5 text-center text-sm font-semibold tabular-nums">
                                        {qty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => incrementProduct(p.id)}
                                        disabled={atMax}
                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-separator bg-surface text-sm hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label="Aumentar cantidad"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={outOfStock}
                                      onClick={() => addProduct(p.id)}
                                      className="shrink-0 rounded-md border border-separator bg-surface px-2.5 py-1 text-xs font-medium hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Agregar
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ModalSection>

                      {(selectedServiceIds.length > 0 || selectedProductsCount > 0) && (
                        <div className="flex items-center justify-between rounded-xl border border-separator bg-surface-secondary/60 px-4 py-3 text-base font-semibold">
                          <span>Total estimado</span>
                          <span className="tabular-nums">{formatMoney(selectedGrandTotal)}</span>
                        </div>
                      )}
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button type="button" variant="secondary" onPress={closeModal}>Cancelar</Button>
                    <Button
                      type="button"
                      variant="primary"
                      isDisabled={creating}
                      onPress={() => formRef.current?.requestSubmit()}
                    >
                      {creating ? "Guardando..." : "Guardar"}
                    </Button>
                  </Modal.Footer>
                </form>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

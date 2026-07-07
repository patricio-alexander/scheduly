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
  Chip,
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
import CalendarIcon from "@gravity-ui/icons/Calendar";
import { PageHeader } from "@/shared/components/ui";
import Person from "@gravity-ui/icons/Person";
import Bell from "@gravity-ui/icons/Bell";
import Clock from "@gravity-ui/icons/Clock";
import Envelope from "@gravity-ui/icons/Envelope";
import Smartphone from "@gravity-ui/icons/Smartphone";
import Gear from "@gravity-ui/icons/Gear";

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

interface AppointmentDetail {
  id: number;
  title: string;
  description: string;
  appointmentDate: string;
  status: string;
  customer: {
    id: number;
    name: string;
    lastnames: string;
    phone: string;
    email: string;
  };
  user: { id: number; name: string };
  services: Array<{ service: ServiceOption }>;
}

const appointmentSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  rescheduled: "Reagendado",
  completed: "Completado",
  cancelled: "Cancelado",
};

const statusColor: Record<string, "accent" | "warning" | "success" | "danger"> = {
  scheduled: "accent",
  rescheduled: "warning",
  completed: "success",
  cancelled: "danger",
};

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

function DetailSection({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-separator bg-surface-secondary/50 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </section>
  );
}

export default function AgendaPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailData, setDetailData] = useState<AppointmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"detail" | "create" | "edit">("detail");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [creating, setCreating] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const modal = useOverlayState();
  const [selectedDate, setSelectedDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [selectedTime, setSelectedTime] = useState<TimeValue>(parseTime("09:00"));
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("scheduled");

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
  }, [modal]);

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
    fetch(apiUrl("/api/customers")).then((r) => r.json()).then(setCustomers);
    fetch(apiUrl("/api/services")).then((r) => r.json()).then(setServices);
  }, []);

  const handleEventClick = async (info: { event: { id: string; title: string; start: Date | null; extendedProps: Record<string, unknown> } }) => {
    const e = info.event;
    setSelectedEvent({
      id: e.id,
      title: e.title,
      start: e.start?.toISOString() ?? "",
      extendedProps: e.extendedProps as CalendarEvent["extendedProps"],
    });
    setViewMode("detail");
    setDetailData(null);
    setDetailLoading(true);
    modal.open();
    try {
      const res = await fetch(apiUrl(`/api/appointments/${e.id}`));
      if (res.ok) {
        setDetailData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDateClick = (info: { dateStr: string }) => {
    setSelectedDate(parseDate(info.dateStr.slice(0, 10)));
    setSelectedTime(parseTime("09:00"));
    setSelectedEvent({
      id: "",
      title: "",
      start: info.dateStr,
      extendedProps: { description: "", customer: "", user: "", status: "scheduled" },
    });
    reset({
      title: "",
      description: "",
    });
    setSelectedServiceIds([]);
    setSelectedCustomerId("");
    setSelectedStatus("scheduled");
    setViewMode("create");
    modal.open();
  };

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
      setDetailData(data);
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
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<CalendarIcon width={24} height={24} />}
        title="Agenda"
        description="Visualiza y gestiona los turnos de tu negocio"
      />

      <div className="bg-surface rounded-2xl border border-separator shadow-sm p-4">
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
            height="auto"
            dayMaxEvents={3}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
          />
        )}
      </div>

      <Modal state={modal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center">
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />

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
                      <p className="text-muted text-sm py-4 text-center">Cargando detalles del turno...</p>
                    ) : detailData ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <Chip
                            color={statusColor[detailData.status] ?? "default"}
                            variant="soft"
                            size="sm"
                          >
                            {statusLabel[detailData.status] ?? detailData.status}
                          </Chip>
                          <span className="text-xs text-muted">#{detailData.id}</span>
                        </div>

                        <DetailSection
                          label="Cliente"
                          icon={<Person width={14} height={14} />}
                        >
                          <p className="text-sm font-medium">
                            {detailData.customer.name} {detailData.customer.lastnames}
                          </p>
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
                        </DetailSection>

                        <DetailSection
                          label="Fecha y hora"
                          icon={<CalendarIcon width={14} height={14} />}
                        >
                          {(() => {
                            const { date, time } = formatAppointmentDate(detailData.appointmentDate);
                            return (
                              <>
                                <p className="text-sm font-medium capitalize">{date}</p>
                                <div className="flex items-center gap-2 text-sm text-muted">
                                  <Clock width={14} height={14} className="shrink-0" />
                                  <span>{time} hrs</span>
                                </div>
                              </>
                            );
                          })()}
                        </DetailSection>

                        <DetailSection
                          label="Profesional"
                          icon={<Person width={14} height={14} />}
                        >
                          <p className="text-sm font-medium">{detailData.user.name}</p>
                        </DetailSection>

                        <DetailSection
                          label="Servicios"
                          icon={<Gear width={14} height={14} />}
                        >
                          {detailData.services.length === 0 ? (
                            <p className="text-sm text-muted">Sin servicios asignados</p>
                          ) : (
                            <>
                              <ul className="flex flex-col gap-1.5">
                                {detailData.services.map(({ service }) => (
                                  <li
                                    key={service.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span>{service.name}</span>
                                    <span className="font-medium">${service.price.toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="flex items-center justify-between pt-2 border-t border-separator text-sm font-semibold">
                                <span>Total</span>
                                <span>
                                  $
                                  {detailData.services
                                    .reduce((sum, { service }) => sum + service.price, 0)
                                    .toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </DetailSection>

                        {detailData.description && (
                          <DetailSection
                            label="Descripción"
                            icon={<Bell width={14} height={14} />}
                          >
                            <p className="text-sm text-muted whitespace-pre-wrap">{detailData.description}</p>
                          </DetailSection>
                        )}
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
                        <Chip color={statusColor[selectedEvent.extendedProps.status] ?? "default"} variant="soft" size="sm">
                          {statusLabel[selectedEvent.extendedProps.status] ?? selectedEvent.extendedProps.status}
                        </Chip>
                      </div>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
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
                  <Modal.Body className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="apt-title" className="text-sm font-medium">Título</label>
                        <input
                          id="apt-title"
                          placeholder="Corte de cabello"
                          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
                          {...register("title")}
                        />
                        {errors.title && <p className="text-danger text-sm">{String(errors.title.message ?? "")}</p>}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor="apt-description" className="text-sm font-medium">Descripción</label>
                        <textarea
                          id="apt-description"
                          rows={3}
                          placeholder="Detalles del turno..."
                          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus resize-none"
                          {...register("description")}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
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
                      </div>

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
                                  {({year}) => <Calendar.YearPickerCell year={year} />}
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
                              {Object.entries(statusLabel).map(([key, label]) => (
                                <ListBox.Item key={key} id={key} textValue={label}>
                                  {label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </ComboBox.Popover>
                        </ComboBox>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Servicios</label>
                        {services.length === 0 ? (
                          <p className="text-muted text-sm">No hay servicios disponibles</p>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {services.map((s) => {
                                const selected = selectedServiceIds?.includes(s.id) ?? false;
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => toggleService(s.id)}
                                    className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                                      selected
                                        ? "bg-accent text-accent-foreground border-accent"
                                        : "bg-field-background text-field-foreground border-separator hover:border-accent"
                                    }`}
                                  >
                                    {s.name} — ${s.price.toFixed(2)}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="text-sm font-semibold text-right pt-1">
                              Total: $
                              {services
                                .filter((s) => selectedServiceIds?.includes(s.id))
                                .reduce((sum, s) => sum + s.price, 0)
                                .toFixed(2)}
                            </div>
                          </>
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

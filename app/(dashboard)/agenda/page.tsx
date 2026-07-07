"use client";

import { apiUrl } from "@/shared/utils/api";
import { useEffect, useRef, useState, useCallback } from "react";
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
import Person from "@gravity-ui/icons/Person";
import Bell from "@gravity-ui/icons/Bell";

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

const appointmentSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  status: z.string(),
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

export default function AgendaPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<"detail" | "create" | "edit">("detail");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [creating, setCreating] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
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
    setValue,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "scheduled",
    },
  });

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

  if (!user) return null;

  const handleEventClick = (info: { event: { id: string; title: string; start: Date | null; extendedProps: Record<string, unknown> } }) => {
    const e = info.event;
    setSelectedEvent({
      id: e.id,
      title: e.title,
      start: e.start?.toISOString() ?? "",
      extendedProps: e.extendedProps as CalendarEvent["extendedProps"],
    });
    setViewMode("detail");
    modal.open();
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

  const closeModal = useCallback(() => {
    modal.close();
    setSelectedEvent(null);
  }, [modal]);

  const handleEdit = async () => {
    if (!selectedEvent?.id) return;
    try {
      const res = await fetch(apiUrl(`/api/appointments/${selectedEvent.id}`));
      const data = await res.json();
      const datePart = data.appointmentDate.slice(0, 10);
      const timePart = data.appointmentDate.slice(11, 16);
      setSelectedDate(parseDate(datePart));
      setSelectedTime(parseTime(timePart));
      reset({
        title: data.title,
        description: data.description,
      });
      setSelectedServiceIds(data.serviceIds ?? []);
      setSelectedCustomerId(String(data.customerId));
      setSelectedStatus(data.status);
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
    if (!selectedCustomerId) return;
    setCreating(true);
    const isEdit = viewMode === "edit" && selectedEvent?.id;
    try {
      const dateStr = `${selectedDate.toString()}T${selectedTime.toString()}:00`;
      const payload = {
        ...data,
        customerId: Number(selectedCustomerId),
        userId: user.id,
        appointmentDate: dateStr,
        serviceIds: selectedServiceIds,
        status: selectedStatus,
      };
      await fetch(apiUrl(isEdit ? `/api/appointments/${selectedEvent.id}` : "/api/appointments"), {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(isEdit ? "Turno actualizado" : "Turno creado");
      closeModal();
      fetchEvents();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>
      </div>

      <div className="bg-surface rounded-xl border border-separator p-4">
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
                    <Modal.Heading>{selectedEvent.title}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Person width={16} height={16} className="text-muted shrink-0" />
                        <span>{selectedEvent.extendedProps.customer}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon width={16} height={16} className="text-muted shrink-0" />
                        <span>{new Date(selectedEvent.start).toLocaleString("es-CL")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Bell width={16} height={16} className="text-muted shrink-0" />
                        <Chip color={statusColor[selectedEvent.extendedProps.status] ?? "default"} variant="soft" size="sm">
                          {statusLabel[selectedEvent.extendedProps.status] ?? selectedEvent.extendedProps.status}
                        </Chip>
                      </div>
                      {selectedEvent.extendedProps.description && (
                        <div className="pt-2 border-t border-separator">
                          <p className="text-sm text-muted mb-1">Descripción</p>
                          <p className="text-sm">{selectedEvent.extendedProps.description}</p>
                        </div>
                      )}
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onPress={closeModal}>Cerrar</Button>
                    <Button variant="primary" onPress={handleEdit}>Editar</Button>
                  </Modal.Footer>
                </>
              )}

              {/* ── Crear / Editar ── */}
              {(viewMode === "create" || viewMode === "edit") && selectedEvent && (
                <>
                  <Modal.Header>
                    <Modal.Icon>
                      <CalendarIcon width={20} height={20} />
                    </Modal.Icon>
                    <Modal.Heading>{viewMode === "edit" ? "Editar turno" : "Nuevo turno"}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <form id="appointment-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                    </form>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onPress={closeModal}>Cancelar</Button>
                    <Button type="submit" variant="primary" isDisabled={creating} form="appointment-form">
                      {creating ? "Guardando..." : "Guardar"}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

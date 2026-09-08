"use client";

import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  SearchField,
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
import type { EventContentArg, EventDropArg } from "@fullcalendar/core";
import CalendarIcon from "@gravity-ui/icons/Calendar";
import { PageHeader } from "@/shared/components/ui";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { StatusChip } from "@/shared/components/StatusChip";
import { StatusLegend } from "@/shared/components/StatusLegend";
import { statusCalendarClass, statusLabel, appointmentStatusOptions } from "@/shared/utils/appointment-status";
import Plus from "@gravity-ui/icons/Plus";
import Person from "@gravity-ui/icons/Person";
import Envelope from "@gravity-ui/icons/Envelope";
import Smartphone from "@gravity-ui/icons/Smartphone";
import CreditCard from "@gravity-ui/icons/CreditCard";
import CrownDiamond from "@gravity-ui/icons/CrownDiamond";
import { formatRewardApplyLabel } from "@/shared/utils/reward-apply";
import { calcRewardDiscountAmount } from "@/shared/utils/reward-discount";
import { paymentMethodLabel, paymentMethodOptions, type PaymentMethodValue } from "@/shared/utils/payment-methods";
import { formatMoney, lineTotal, toAmount, toQuantity } from "@/shared/utils/money";
import { useAppointmentSocket } from "@/src/features/appointments";
import type { AppointmentCalendarEvent } from "@/src/features/appointments";
import { BranchSelector, StaffSelector, useBranches, type StaffMember } from "@/src/features/branches";
import {
  canDeleteRecords,
  isBranchAdminRole,
  isEmployeeRole,
  isOwnerRole,
} from "@/shared/utils/roles";
import TrashBin from "@gravity-ui/icons/TrashBin";

type CalendarEvent = AppointmentCalendarEvent;

type BranchScope = {
  id: number | null;
  name: string | null;
  locked: boolean;
};

type AgendaScope = {
  filter: "all" | "branch" | "mine" | "employee";
  userId: number | null;
};

function eventMatchesAgendaScope(
  event: CalendarEvent,
  agendaScope: AgendaScope | null,
  branchScope: BranchScope | null,
) {
  if (agendaScope?.filter === "mine" && agendaScope.userId) {
    return event.extendedProps.userId === agendaScope.userId;
  }
  if (agendaScope?.filter === "employee" && agendaScope.userId) {
    return event.extendedProps.userId === agendaScope.userId;
  }
  if (!branchScope) return true;
  if (!branchScope.locked && branchScope.id == null) return true;
  if (!branchScope.id) return true;
  return event.extendedProps.branchId === branchScope.id;
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

interface ClaimableReward {
  id: number;
  name: string;
  description: string;
  pointsCost: number;
  discountPct: number | null;
  serviceId: number | null;
  productId: number | null;
  service?: { id: number; name: string } | null;
  product?: { id: number; name: string } | null;
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
  customerPoints?: number;
  claimableRewards?: ClaimableReward[];
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
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function customerInitials(name: string, lastnames: string) {
  const first = name.trim()[0] ?? "";
  const last = lastnames.trim()[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function DetailInfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface/60 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-foreground/50">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">{label}</p>
        <p className="mt-0.5 text-sm font-medium capitalize text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SummaryLineItem({
  name,
  meta,
  amount,
}: {
  name: string;
  meta?: string;
  amount: string;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{name}</p>
        {meta ? <p className="text-xs text-foreground/55">{meta}</p> : null}
      </div>
      <span className="shrink-0 tabular-nums font-semibold text-foreground">{amount}</span>
    </li>
  );
}

function RewardOption({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
        selected
          ? "bg-accent/12 ring-2 ring-accent/40"
          : "bg-surface/70 ring-1 ring-separator hover:bg-surface-secondary/80"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-accent bg-accent" : "border-foreground/25 bg-transparent"
        }`}
        aria-hidden
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </button>
  );
}

export default function AgendaPage() {
  const { user } = useAuth();
  const isOwner = isOwnerRole(user?.role);
  const isBranchAdmin = isBranchAdminRole(user?.role);
  /** Dueña: solo lectura (ve todos / por sucursal). Admin y empleados agendan. */
  const canSchedule =
    isEmployeeRole(user?.role) || isBranchAdminRole(user?.role);
  const { branches } = useBranches();
  const searchParams = useSearchParams();
  const router = useRouter();
  const personalAgendaView =
    isEmployeeRole(user?.role) ||
    (isBranchAdminRole(user?.role) && searchParams.get("view") === "mine");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideCancelled, setHideCancelled] = useState(true);
  const [branchFilter, setBranchFilter] = useState<number | "all">("all");
  const [staffFilter, setStaffFilter] = useState<number | "all">("all");
  const [branchStaff, setBranchStaff] = useState<StaffMember[]>([]);
  const [branchScope, setBranchScope] = useState<BranchScope | null>(null);
  const [agendaScope, setAgendaScope] = useState<AgendaScope | null>(null);
  const branchScopeRef = useRef<BranchScope | null>(null);
  const agendaScopeRef = useRef<AgendaScope | null>(null);
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
  const spotlightAppliedRef = useRef<string | null>(null);
  const modal = useOverlayState();
  const paymentConfirmState = useOverlayState();
  const deleteConfirmState = useOverlayState();
  const [selectedDate, setSelectedDate] = useState<CalendarDate>(today(getLocalTimeZone()));
  const [selectedTime, setSelectedTime] = useState<TimeValue>(parseTime("09:00"));
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, number>>({});
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("scheduled");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

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
    paymentConfirmState.close();
    deleteConfirmState.close();
    setSelectedEvent(null);
    setDetailData(null);
    setDetailLoading(false);
    setSelectedDayDate("");
    setProductSearch("");
  }, [modal, paymentConfirmState, deleteConfirmState]);

  const openCreate = useCallback((dateStr?: string) => {
    if (!canSchedule) return;
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
    setProductSearch("");
    setSelectedCustomerId("");
    setSelectedStatus("scheduled");
    setSelectedDayDate("");
    setViewMode("create");
    modal.open();
  }, [modal, reset, canSchedule]);

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
    const url = new URL(apiUrl("/api/appointments"), window.location.origin);
    if (isOwner && branchFilter !== "all") {
      url.searchParams.set("branchId", String(branchFilter));
    }
    if (isBranchAdmin && personalAgendaView) {
      url.searchParams.set("view", "mine");
    }
    if ((isBranchAdmin || isOwner) && !personalAgendaView && staffFilter !== "all") {
      url.searchParams.set("userId", String(staffFilter));
    }
    fetch(url.toString(), { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json?.events) ? json.events : [];
        setEvents(list);
        setBranchScope(json?.branchScope ?? null);
        setAgendaScope(json?.agendaScope ?? null);
      })
      .finally(() => setLoading(false));
  }, [isOwner, isBranchAdmin, branchFilter, staffFilter, personalAgendaView]);

  useEffect(() => {
    branchScopeRef.current = branchScope;
    agendaScopeRef.current = agendaScope;
  }, [branchScope, agendaScope]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const showStaffFilter =
    !personalAgendaView && (isBranchAdmin || (isOwner && branchFilter !== "all"));

  useEffect(() => {
    if (!showStaffFilter) {
      setBranchStaff([]);
      return;
    }

    const url = new URL(apiUrl("/api/branches/staff"), window.location.origin);
    if (isOwner && branchFilter !== "all") {
      url.searchParams.set("branchId", String(branchFilter));
    }

    let cancelled = false;
    fetch(url.toString(), { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((json) => {
        if (cancelled) return;
        setBranchStaff(Array.isArray(json) ? json : []);
      })
      .catch(() => {
        if (!cancelled) setBranchStaff([]);
      });

    return () => {
      cancelled = true;
    };
  }, [showStaffFilter, isOwner, branchFilter]);

  useEffect(() => {
    if (staffFilter === "all") return;
    if (!branchStaff.some((member) => member.id === staffFilter)) {
      setStaffFilter("all");
    }
  }, [branchStaff, staffFilter]);

  useEffect(() => {
    const raw = searchParams.get("appointmentId");
    if (!raw) {
      spotlightAppliedRef.current = null;
      setSpotlightId(null);
      return;
    }
    setSpotlightId(String(raw));
  }, [searchParams]);

  useEffect(() => {
    if (loading || !spotlightId) return;
    if (spotlightAppliedRef.current === spotlightId) return;

    const target = events.find((e) => e.id === spotlightId);
    if (!target) return;

    let clearTimer: number | undefined;
    const applyTimer = window.setTimeout(() => {
      const api = calendarRef.current?.getApi();
      if (!api) return;

      spotlightAppliedRef.current = spotlightId;
      const start = new Date(target.start);
      if (!Number.isNaN(start.getTime())) {
        api.changeView("timeGridDay", start);
        api.gotoDate(start);
      }

      clearTimer = window.setTimeout(() => {
        setSpotlightId(null);
        spotlightAppliedRef.current = null;
      }, 4500);
    }, 80);

    return () => {
      window.clearTimeout(applyTimer);
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, [loading, events, spotlightId]);

  useAppointmentSocket({
    onCreated: (event) => {
      if (
        !eventMatchesAgendaScope(
          event,
          agendaScopeRef.current,
          branchScopeRef.current,
        )
      ) {
        return;
      }
      setEvents((prev) => {
        if (prev.some((e) => e.id === event.id)) {
          return prev.map((e) => (e.id === event.id ? { ...event } : e));
        }
        return [...prev, { ...event }];
      });
      requestAnimationFrame(() => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        const existing = api.getEventById(event.id);
        if (existing) {
          existing.setProp("title", event.title);
          existing.setStart(event.start);
          existing.setExtendedProp("description", event.extendedProps.description);
          existing.setExtendedProp("customer", event.extendedProps.customer);
          existing.setExtendedProp("user", event.extendedProps.user);
          existing.setExtendedProp("status", event.extendedProps.status);
        } else {
          api.addEvent({ ...event });
        }
      });
    },
    onUpdated: (event) => {
      const matches = eventMatchesAgendaScope(
        event,
        agendaScopeRef.current,
        branchScopeRef.current,
      );
      if (!matches) {
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
        requestAnimationFrame(() => {
          calendarRef.current?.getApi()?.getEventById(event.id)?.remove();
        });
        return;
      }
      setEvents((prev) => {
        if (prev.some((e) => e.id === event.id)) {
          return prev.map((e) => (e.id === event.id ? { ...event } : e));
        }
        return [...prev, { ...event }];
      });
      setSelectedEvent((prev) => (prev?.id === event.id ? { ...event } : prev));
      setDetailData((prev) => {
        if (!prev || String(prev.id) !== event.id) return prev;
        return {
          ...prev,
          description: event.extendedProps.description,
          appointmentDate: event.start,
          status: event.extendedProps.status,
        };
      });
      requestAnimationFrame(() => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        const existing = api.getEventById(event.id);
        if (existing) {
          existing.setProp("title", event.title);
          existing.setStart(event.start);
          existing.setExtendedProp("description", event.extendedProps.description);
          existing.setExtendedProp("customer", event.extendedProps.customer);
          existing.setExtendedProp("user", event.extendedProps.user);
          existing.setExtendedProp("status", event.extendedProps.status);
        } else {
          api.addEvent({ ...event });
        }
      });
    },
    onDeleted: (id) => {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSelectedEvent((prev) => (prev?.id === id ? null : prev));
      setDetailData((prev) => (prev && String(prev.id) === id ? null : prev));
      requestAnimationFrame(() => {
        calendarRef.current?.getApi().getEventById(id)?.remove();
      });
    },
  });

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
    setSelectedRewardId(null);
    setPaymentNotes("");
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
        .filter((e) =>
          hideCancelled ? e.extendedProps.status !== "cancelled" : true,
        )
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [events, hideCancelled],
  );

  const visibleEvents = useMemo(
    () =>
      hideCancelled
        ? events.filter((e) => e.extendedProps.status !== "cancelled")
        : events,
    [events, hideCancelled],
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
      setProductSearch("");
      setViewMode("edit");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/appointments/${selectedEvent.id}`));
      if (!res.ok) return;
      const data: AppointmentDetail = await res.json();
      setDetailData(normalizeAppointmentDetail(data));
      applyAppointmentToForm(data);
      setProductSearch("");
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

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (selectedProducts[p.id] ?? 0) > 0,
    );
  }, [products, productSearch, selectedProducts]);

  const selectedProductsTotal = calcProductsTotal(products, selectedProducts);
  const selectedGrandTotal = selectedServicesTotal + selectedProductsTotal;

  const detailTotal = detailData
    ? detailData.services.reduce((sum, { service }) => sum + toAmount(service.price), 0) +
      (detailData.products?.reduce(
        (sum, { product, quantity }) => sum + lineTotal(product.price, quantity),
        0,
      ) ?? 0)
    : 0;

  const selectedReward =
    detailData?.claimableRewards?.find((r) => r.id === selectedRewardId) ?? null;

  const rewardDiscount =
    selectedReward && detailData
      ? calcRewardDiscountAmount(selectedReward, {
          services: detailData.services,
          products: detailData.products ?? [],
        })
      : 0;

  const paymentTotal = Math.max(0, Math.round((detailTotal - rewardDiscount) * 100) / 100);

  const handleRegisterPayment = async () => {
    if (!detailData?.id) return;
    setPaying(true);
    try {
      const res = await fetch(apiUrl(`/api/appointments/${detailData.id}/payment`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: paymentMethod,
          amount: paymentTotal,
          notes: paymentNotes,
          rewardId: selectedRewardId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.danger(err.message ?? "Error al registrar el pago");
        return;
      }
      toast.success(
        selectedReward
          ? `Pago registrado con premio "${selectedReward.name}"`
          : "Pago registrado y turno cerrado",
      );
      paymentConfirmState.close();
      setSelectedRewardId(null);
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

  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const id = info.event.id;
    const newStart = info.event.start;
    if (!id || !newStart) {
      info.revert();
      return;
    }

    const appointmentDate = newStart.toISOString();
    try {
      const res = await fetch(apiUrl(`/api/appointments/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.danger(
          typeof err.message === "string"
            ? err.message
            : "No se pudo mover el turno",
        );
        info.revert();
        return;
      }

      const payload = (await res.json().catch(() => null)) as
        | CalendarEvent
        | null;
      if (payload?.id) {
        setEvents((prev) =>
          prev.map((e) => (e.id === payload.id ? payload : e)),
        );
      } else {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  start: appointmentDate,
                  extendedProps: {
                    ...e.extendedProps,
                    status:
                      e.extendedProps.status === "scheduled" ||
                      e.extendedProps.status === "rescheduled"
                        ? "rescheduled"
                        : e.extendedProps.status,
                  },
                }
              : e,
          ),
        );
      }
      toast.success("Turno reprogramado");
    } catch {
      toast.danger("No se pudo mover el turno");
      info.revert();
    }
  }, []);

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
      const appointmentBranchId = isOwner
        ? branchFilter !== "all"
          ? branchFilter
          : (branchScope?.id ?? user.branch?.id ?? null)
        : (branchScope?.id ?? user.branch?.id ?? null);
      const assigneeUserId =
        !personalAgendaView &&
        (isOwner || isBranchAdmin) &&
        staffFilter !== "all"
          ? staffFilter
          : user.id;
      const payload = {
        ...data,
        customerId: Number(selectedCustomerId),
        userId: assigneeUserId,
        branchId: appointmentBranchId,
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

  const canDeleteAppointments = canDeleteRecords(user.role);

  const handleDeleteAppointment = async () => {
    if (!detailData) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/api/appointments/${detailData.id}`), {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.danger(err.message ?? "No se pudo eliminar el turno");
        return;
      }
      toast.success("Turno eliminado");
      deleteConfirmState.close();
      closeModal();
      setEvents((prev) => prev.filter((e) => e.id !== String(detailData.id)));
      requestAnimationFrame(() => {
        calendarRef.current?.getApi().getEventById(String(detailData.id))?.remove();
      });
    } catch {
      toast.danger("No se pudo eliminar el turno");
    } finally {
      setDeleting(false);
    }
  };

  const agendaTitle = personalAgendaView
    ? "Mi agenda"
    : isBranchAdmin
      ? "Agenda sucursal"
      : isOwner
        ? "Agenda general"
        : "Agenda";
  const selectedStaffName =
    staffFilter !== "all"
      ? branchStaff.find((member) => member.id === staffFilter)?.name
      : null;
  const agendaDescription = personalAgendaView
    ? "Consulta y gestiona tus turnos asignados"
    : isOwner
      ? selectedStaffName
        ? `Turnos de ${selectedStaffName} · solo lectura`
        : branchFilter !== "all" && branchScope?.name
          ? `${branchScope.name} · solo lectura`
          : "Todos los locales · filtra por sucursal (solo lectura)"
      : selectedStaffName
        ? `Turnos de ${selectedStaffName}`
        : isBranchAdmin && branchScope?.name
          ? `Turnos de ${branchScope.name}`
          : branchScope?.name
            ? `Turnos de ${branchScope.name}`
            : "Visualiza y gestiona los turnos de tu negocio";

  const setAgendaView = (mode: "branch" | "mine") => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "mine") {
      params.set("view", "mine");
    } else {
      params.delete("view");
    }
    const query = params.toString();
    router.replace(
      query ? `${appRoutes.operation.agenda}?${query}` : appRoutes.operation.agenda,
    );
  };

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col gap-4 sm:h-[calc(100dvh-4rem)] sm:gap-6">
      <div className="shrink-0">
        <PageHeader
        icon={<CalendarIcon width={24} height={24} />}
        title={agendaTitle}
        description={agendaDescription}
        action={
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {isBranchAdmin ? (
              <div className="inline-flex shrink-0 rounded-xl border border-separator bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setAgendaView("branch")}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    !personalAgendaView
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Sucursal
                </button>
                <button
                  type="button"
                  onClick={() => setAgendaView("mine")}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    personalAgendaView
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Mis turnos
                </button>
              </div>
            ) : null}
            {isOwner ? (
              <BranchSelector
                branches={branches}
                value={branchFilter}
                className="w-auto min-w-[11rem] shrink-0"
                onChange={(value) => {
                  setBranchFilter(value);
                  setStaffFilter("all");
                }}
              />
            ) : null}
            {showStaffFilter ? (
              <StaffSelector
                staff={branchStaff}
                value={staffFilter}
                className="w-auto min-w-[11rem] shrink-0"
                onChange={setStaffFilter}
              />
            ) : null}
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                className="rounded border-separator"
                checked={hideCancelled}
                onChange={(e) => setHideCancelled(e.target.checked)}
              />
              Ocultar cancelados
            </label>
            {canSchedule ? (
              <div className="shrink-0" data-onboarding="agenda-create">
                <Button variant="primary" onPress={() => openCreate()}>
                  <Plus width={16} height={16} />
                  <span className="whitespace-nowrap">Agendar turno</span>
                </Button>
              </div>
            ) : null}
          </div>
        }
      />
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-separator bg-surface p-4 shadow-sm">
        <div data-onboarding="agenda-legend">
          <StatusLegend className="mb-4 shrink-0 border-b border-separator pb-4" />
        </div>
        <div className="agenda-calendar min-h-0 flex-1" data-onboarding="agenda-calendar">
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
              events={visibleEvents}
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
              editable={canSchedule}
              eventStartEditable={canSchedule}
              eventDurationEditable={false}
              eventDrop={canSchedule ? handleEventDrop : undefined}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              eventContent={(arg) => <CalendarEventContent arg={arg} />}
              eventClassNames={(arg) => {
                const status = String(arg.event.extendedProps.status ?? "scheduled");
                const classes = [
                  statusCalendarClass[status] ?? statusCalendarClass.scheduled,
                ];
                if (spotlightId && arg.event.id === spotlightId) {
                  classes.push("fc-event-spotlight");
                }
                return classes;
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
                    {canSchedule ? (
                      <Button variant="primary" onPress={() => openCreate(selectedDayDate)}>
                        <Plus width={16} height={16} />
                        Agendar turno
                      </Button>
                    ) : null}
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
                      {detailData
                        ? `${detailData.customer.name} ${detailData.customer.lastnames}`
                        : selectedEvent.title.split(" - ")[0]}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    {detailLoading ? (
                      <div className="flex flex-col items-center gap-3 py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                        <p className="text-sm text-foreground/60">Cargando turno...</p>
                      </div>
                    ) : detailData ? (
                      <div className="flex flex-col gap-5">
                        {/* Hero: cliente + estado + horario */}
                        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 via-surface-secondary/50 to-surface ring-1 ring-separator/80">
                          <div className="p-5">
                            <div className="flex items-start gap-4">
                              <div
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-lg font-bold text-accent"
                                aria-hidden
                              >
                                {customerInitials(
                                  detailData.customer.name,
                                  detailData.customer.lastnames,
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-lg font-semibold leading-tight text-foreground">
                                    {detailData.customer.name} {detailData.customer.lastnames}
                                  </p>
                                  <StatusChip status={detailData.status} size="sm" />
                                </div>
                                <p className="mt-1 text-sm text-foreground/65">
                                  {detailData.title}
                                  <span className="mx-1.5 text-foreground/30">·</span>
                                  <span className="tabular-nums">#{detailData.id}</span>
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              <DetailInfoRow
                                icon={<CalendarIcon width={15} height={15} />}
                                label="Fecha y hora"
                                value={`${formatAppointmentDate(detailData.appointmentDate).date}, ${formatAppointmentDate(detailData.appointmentDate).time}`}
                              />
                              <DetailInfoRow
                                icon={<Person width={15} height={15} />}
                                label="Profesional"
                                value={detailData.user.name}
                              />
                            </div>

                            {(detailData.customer.phone || detailData.customer.email) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {detailData.customer.phone ? (
                                  <a
                                    href={`tel:${detailData.customer.phone}`}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-medium text-foreground/80 ring-1 ring-separator transition-colors hover:bg-surface-secondary"
                                  >
                                    <Smartphone width={13} height={13} />
                                    {detailData.customer.phone}
                                  </a>
                                ) : null}
                                {detailData.customer.email ? (
                                  <a
                                    href={`mailto:${detailData.customer.email}`}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-medium text-foreground/80 ring-1 ring-separator transition-colors hover:bg-surface-secondary"
                                  >
                                    <Envelope width={13} height={13} />
                                    {detailData.customer.email}
                                  </a>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>

                        {detailData.description ? (
                          <div className="rounded-2xl bg-surface-secondary/40 px-4 py-3 ring-1 ring-separator/60">
                            <p className="text-xs font-medium text-foreground/50">Notas</p>
                            <p className="mt-1 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                              {detailData.description}
                            </p>
                          </div>
                        ) : null}

                        {(detailData.services.length > 0 ||
                          (detailData.products?.length ?? 0) > 0) && (
                          <div className="overflow-hidden rounded-2xl ring-1 ring-separator">
                            <div className="border-b border-separator bg-surface-secondary/40 px-4 py-2.5">
                              <p className="text-sm font-semibold text-foreground">Desglose</p>
                            </div>
                            <ul className="divide-y divide-separator/70 px-4">
                              {detailData.services.map(({ service }) => (
                                <SummaryLineItem
                                  key={service.id}
                                  name={service.name}
                                  meta="Servicio"
                                  amount={formatMoney(service.price)}
                                />
                              ))}
                              {(detailData.products ?? []).map(({ product, quantity }) => {
                                const qty = toQuantity(quantity);
                                return (
                                  <SummaryLineItem
                                    key={product.id}
                                    name={product.name}
                                    meta={qty > 1 ? `Producto · ×${qty}` : "Producto"}
                                    amount={formatMoney(lineTotal(product.price, qty))}
                                  />
                                );
                              })}
                            </ul>
                            <div className="flex items-center justify-between border-t border-separator bg-surface-secondary/30 px-4 py-3.5">
                              <span className="font-semibold text-foreground">Total</span>
                              <span className="text-lg font-bold tabular-nums text-accent">
                                {formatMoney(detailTotal)}
                              </span>
                            </div>
                          </div>
                        )}

                        {detailData.payment ? (
                          <div className="overflow-hidden rounded-2xl ring-1 ring-success/25">
                            <div className="flex items-center justify-between gap-3 border-b border-separator bg-success/5 px-4 py-3">
                              <div>
                                <p className="text-xs font-medium text-foreground/55">Pago registrado</p>
                                <p className="text-xl font-bold tabular-nums text-success">
                                  {formatMoney(detailData.payment.amount)}
                                </p>
                              </div>
                              <StatusChip status="completed" size="sm" />
                            </div>
                            <dl className="grid gap-3 px-4 py-4 sm:grid-cols-2">
                              <div>
                                <dt className="text-xs text-foreground/50">Método</dt>
                                <dd className="mt-0.5 text-sm font-medium">
                                  {paymentMethodLabel[detailData.payment.method]}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs text-foreground/50">Fecha de cobro</dt>
                                <dd className="mt-0.5 text-sm font-medium">
                                  {new Date(detailData.payment.paidAt).toLocaleString("es-CL")}
                                </dd>
                              </div>
                            </dl>
                            {detailData.payment.notes ? (
                              <div className="border-t border-separator px-4 py-3">
                                <p className="text-xs text-foreground/50">Notas del cobro</p>
                                <p className="mt-1 text-sm text-foreground/85 whitespace-pre-wrap">
                                  {detailData.payment.notes}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : canSchedule &&
                          detailData.status !== "cancelled" &&
                          detailData.status !== "completed" ? (
                          <div className="overflow-hidden rounded-2xl ring-1 ring-accent/20">
                            <div className="border-b border-separator bg-accent/5 px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <CreditCard width={18} height={18} className="text-accent" />
                                <div>
                                  <p className="font-semibold text-foreground">Cerrar turno</p>
                                  <p className="text-xs text-foreground/60">
                                    Registra el cobro para completar y descontar stock
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-5 p-4">
                              {(detailData.claimableRewards?.length ?? 0) > 0 ? (
                                <div className="flex flex-col gap-2.5">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-foreground">
                                      Premio de fidelización
                                    </p>
                                    {detailData.customerPoints != null ? (
                                      <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-accent">
                                        {detailData.customerPoints} pts
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <RewardOption
                                      selected={selectedRewardId == null}
                                      onSelect={() => setSelectedRewardId(null)}
                                    >
                                      <p className="text-sm font-medium">Sin premio</p>
                                    </RewardOption>
                                    {detailData.claimableRewards!.map((reward) => {
                                      const applyLabel = formatRewardApplyLabel(reward);
                                      const discount = calcRewardDiscountAmount(reward, {
                                        services: detailData.services,
                                        products: detailData.products ?? [],
                                      });
                                      return (
                                        <RewardOption
                                          key={reward.id}
                                          selected={selectedRewardId === reward.id}
                                          onSelect={() => setSelectedRewardId(reward.id)}
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-2">
                                              <CrownDiamond
                                                width={15}
                                                height={15}
                                                className="mt-0.5 shrink-0 text-accent"
                                              />
                                              <div>
                                                <p className="text-sm font-medium">{reward.name}</p>
                                                {applyLabel ? (
                                                  <p className="text-xs text-foreground/55">{applyLabel}</p>
                                                ) : null}
                                              </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                              <p className="text-xs font-semibold tabular-nums text-foreground/70">
                                                {reward.pointsCost} pts
                                              </p>
                                              {discount > 0 ? (
                                                <p className="text-xs font-semibold tabular-nums text-success">
                                                  −{formatMoney(discount)}
                                                </p>
                                              ) : (
                                                <p className="text-xs text-foreground/50">Canje de puntos</p>
                                              )}
                                            </div>
                                          </div>
                                        </RewardOption>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}

                              <div className="grid gap-4 sm:grid-cols-2">
                                <ComboBox
                                  selectedKey={paymentMethod}
                                  onSelectionChange={(key) =>
                                    setPaymentMethod((key as PaymentMethodValue) ?? "cash")
                                  }
                                  variant="secondary"
                                  className="sm:col-span-1"
                                >
                                  <Label className="text-sm font-medium">Método de pago</Label>
                                  <ComboBox.InputGroup>
                                    <Input />
                                    <ComboBox.Trigger />
                                  </ComboBox.InputGroup>
                                  <ComboBox.Popover>
                                    <ListBox>
                                      {paymentMethodOptions.map((key) => (
                                        <ListBox.Item
                                          key={key}
                                          id={key}
                                          textValue={paymentMethodLabel[key]}
                                        >
                                          {paymentMethodLabel[key]}
                                          <ListBox.ItemIndicator />
                                        </ListBox.Item>
                                      ))}
                                    </ListBox>
                                  </ComboBox.Popover>
                                </ComboBox>
                                <div className="flex flex-col gap-1 sm:col-span-1">
                                  <label htmlFor="payment-notes" className="text-sm font-medium">
                                    Notas <span className="font-normal text-foreground/45">(opcional)</span>
                                  </label>
                                  <textarea
                                    id="payment-notes"
                                    rows={2}
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Referencia, vuelto..."
                                    className="resize-none rounded-xl border border-separator bg-field-background px-3 py-2 text-sm text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
                                  />
                                </div>
                              </div>

                              <div className="rounded-xl bg-surface-secondary/50 px-4 py-3">
                                <div className="flex items-center justify-between text-sm text-foreground/70">
                                  <span>Subtotal</span>
                                  <span className="tabular-nums">{formatMoney(detailTotal)}</span>
                                </div>
                                {rewardDiscount > 0 ? (
                                  <div className="mt-1.5 flex items-center justify-between text-sm text-success">
                                    <span>Descuento premio</span>
                                    <span className="tabular-nums">−{formatMoney(rewardDiscount)}</span>
                                  </div>
                                ) : null}
                                <div className="mt-2 flex items-center justify-between border-t border-separator pt-2.5">
                                  <span className="font-semibold text-foreground">Total a cobrar</span>
                                  <span className="text-lg font-bold tabular-nums text-accent">
                                    {formatMoney(paymentTotal)}
                                  </span>
                                </div>
                              </div>

                              <Button
                                variant="primary"
                                onPress={paymentConfirmState.open}
                                isDisabled={paying || detailTotal <= 0}
                                className="w-full"
                                size="lg"
                              >
                                Registrar pago y cerrar turno
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 rounded-2xl bg-surface-secondary/40 p-4">
                        <div className="flex items-center gap-3 text-sm">
                          <Person width={16} height={16} className="shrink-0 text-foreground/50" />
                          <span>{selectedEvent.extendedProps.customer}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <CalendarIcon width={16} height={16} className="shrink-0 text-foreground/50" />
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
                    {canDeleteAppointments && detailData ? (
                      <Button
                        variant="danger"
                        onPress={deleteConfirmState.open}
                        isDisabled={detailLoading || deleting}
                      >
                        <TrashBin width={16} height={16} />
                        Eliminar
                      </Button>
                    ) : null}
                    <Button variant="secondary" onPress={closeModal}>Cerrar</Button>
                    {canSchedule ? (
                      <Button variant="primary" onPress={handleEdit} isDisabled={detailLoading}>
                        Editar
                      </Button>
                    ) : null}
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
                          <div className="flex flex-col gap-2">
                            <SearchField value={productSearch} onChange={setProductSearch}>
                              <Label className="sr-only">Buscar producto</Label>
                              <SearchField.Group>
                                <SearchField.SearchIcon />
                                <SearchField.Input
                                  className="w-full"
                                  placeholder="Buscar producto..."
                                />
                                <SearchField.ClearButton />
                              </SearchField.Group>
                            </SearchField>
                            <div className="flex max-h-52 flex-col gap-2 overflow-y-auto rounded-xl border border-separator bg-surface-secondary/40 p-3">
                              {filteredProducts.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted">
                                  No se encontraron productos
                                </p>
                              ) : (
                                filteredProducts.map((p) => {
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
                                })
                              )}
                            </div>
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

      {detailData && detailData.status !== "cancelled" && detailData.status !== "completed" && !detailData.payment ? (
        <ConfirmDialog
          state={paymentConfirmState}
          title="Confirmar cierre de turno"
          status="warning"
          confirmLabel="Registrar pago y cerrar"
          pending={paying}
          description={
            <div className="space-y-3">
              <p>
                ¿Registrar el cobro y completar el turno de{" "}
                <strong>
                  {detailData.customer.name} {detailData.customer.lastnames}
                </strong>
                ?
              </p>
              <div className="rounded-xl border border-separator bg-surface-secondary/30 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground/65">Total a cobrar</span>
                  <span className="text-lg font-bold tabular-nums text-accent">
                    {formatMoney(paymentTotal)}
                  </span>
                </div>
                {rewardDiscount > 0 ? (
                  <div className="mt-1.5 flex items-center justify-between text-success">
                    <span>Descuento premio</span>
                    <span className="tabular-nums">−{formatMoney(rewardDiscount)}</span>
                  </div>
                ) : null}
                <div className="mt-2 flex items-center justify-between border-t border-separator pt-2">
                  <span className="text-foreground/65">Método de pago</span>
                  <span className="font-medium">{paymentMethodLabel[paymentMethod]}</span>
                </div>
                {selectedReward ? (
                  <div className="mt-2 flex items-center justify-between border-t border-separator pt-2">
                    <span className="text-foreground/65">Premio</span>
                    <span className="font-medium text-accent">{selectedReward.name}</span>
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-foreground/55">
                Esta acción marca el turno como completado y descontará stock de productos.
              </p>
            </div>
          }
          onConfirm={handleRegisterPayment}
        />
      ) : null}

      {detailData && canDeleteAppointments ? (
        <ConfirmDialog
          state={deleteConfirmState}
          title="Eliminar turno"
          status="danger"
          confirmLabel="Eliminar turno"
          confirmVariant="danger"
          pending={deleting}
          description={
            <div className="space-y-3">
              <p>
                ¿Eliminar el turno de{" "}
                <strong>
                  {detailData.customer.name} {detailData.customer.lastnames}
                </strong>
                ?
              </p>
              {detailData.payment ? (
                <p className="text-sm text-foreground/70">
                  Este turno tiene un pago registrado. Al eliminarlo también se borrará el
                  cobro asociado.
                </p>
              ) : null}
              {detailData.stockDeducted ? (
                <p className="text-sm text-foreground/70">
                  El stock de productos usado se devolverá al inventario.
                </p>
              ) : null}
              <p className="text-xs text-foreground/55">Esta acción no se puede deshacer.</p>
            </div>
          }
          onConfirm={handleDeleteAppointment}
        />
      ) : null}
    </div>
  );
}

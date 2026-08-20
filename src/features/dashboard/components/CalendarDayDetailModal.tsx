"use client";

import { Button, Modal, useOverlayState } from "@heroui/react";
import CalendarIcon from "@gravity-ui/icons/Calendar";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { Skeleton } from "@/shared/components/ui";

type DayIncome = {
  id: string;
  type: "appointment" | "product";
  label: string;
  amount: number;
  at: string;
};

type DayExpense = {
  id: string | number;
  label: string;
  category: string;
  amount: number;
  at: string;
};

type DayDetailResponse = {
  date: string;
  incomes: DayIncome[];
  expenses: DayExpense[];
  totals: {
    income: number;
    expense: number;
    net: number;
  };
};

type CalendarDayDetailModalProps = {
  open: boolean;
  date: Date | string | null;
  onClose: () => void;
  branchId?: number | null;
};

function toDayKey(value: Date | string | null) {
  if (!value) return null;
  if (typeof value === "string") return value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLongDate(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "net";
  icon: ReactNode;
}) {
  const toneClass =
    tone === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "expense"
        ? "text-danger"
        : value >= 0
          ? "text-accent"
          : "text-warning";

  const toneBg =
    tone === "income"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : tone === "expense"
        ? "bg-danger/10 text-danger"
        : "bg-accent/10 text-accent";

  return (
    <div className="rounded-2xl border border-separator bg-surface-secondary/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${toneClass}`}>
            {formatMoney(value)}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function CalendarDayDetailModal({
  open,
  date,
  onClose,
  branchId = null,
}: CalendarDayDetailModalProps) {
  const modal = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });
  const dayKey = useMemo(() => toDayKey(date), [date]);
  const [data, setData] = useState<DayDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) modal.open();
    else modal.close();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!modal.isOpen || !dayKey) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ date: dayKey });
    if (typeof branchId === "number") {
      params.set("branchId", String(branchId));
    }

    setLoading(true);
    setError(null);

    fetch(apiUrl(`/api/finance/calendar-day?${params.toString()}`), {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || "No se pudo cargar el detalle del día");
        }
        return (await response.json()) as DayDetailResponse;
      })
      .then((payload) => setData(payload))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Error al cargar detalle");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [modal.isOpen, dayKey, branchId]);

  return (
    <Modal state={modal}>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center" size="lg" scroll="inside">
          <Modal.Dialog className="!max-w-3xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon>
                <CalendarIcon width={20} height={20} />
              </Modal.Icon>
              <Modal.Heading>
                {dayKey ? formatLongDate(dayKey) : "Detalle del día"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                  </div>
                  <Skeleton className="h-40 rounded-2xl" />
                  <Skeleton className="h-40 rounded-2xl" />
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                  {error}
                </div>
              ) : data ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard
                      label="Ingresos"
                      value={data.totals.income}
                      tone="income"
                      icon={<ArrowUp width={18} height={18} />}
                    />
                    <StatCard
                      label="Gastos"
                      value={data.totals.expense}
                      tone="expense"
                      icon={<ArrowDown width={18} height={18} />}
                    />
                    <StatCard
                      label="Resultado neto"
                      value={data.totals.net}
                      tone="net"
                      icon={<CircleDollar width={18} height={18} />}
                    />
                  </div>

                  <section className="rounded-2xl border border-separator bg-surface">
                    <div className="border-b border-separator px-4 py-3">
                      <h3 className="text-sm font-semibold">Ingresos del día</h3>
                    </div>
                    {data.incomes.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted">Sin ingresos registrados.</p>
                    ) : (
                      <ul className="divide-y divide-separator">
                        {data.incomes.map((income) => (
                          <li
                            key={income.id}
                            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{income.label}</p>
                              <p className="text-xs text-muted">
                                {income.type === "appointment" ? "Turno" : "Producto"} ·{" "}
                                {formatTime(income.at)}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                              {formatMoney(income.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-2xl border border-separator bg-surface">
                    <div className="border-b border-separator px-4 py-3">
                      <h3 className="text-sm font-semibold">Gastos del día</h3>
                    </div>
                    {data.expenses.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted">Sin gastos registrados.</p>
                    ) : (
                      <ul className="divide-y divide-separator">
                        {data.expenses.map((expense) => (
                          <li
                            key={expense.id}
                            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{expense.label}</p>
                              <p className="text-xs text-muted">
                                {expense.category} · {formatTime(expense.at)}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-danger">
                              {formatMoney(expense.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : (
                <p className="rounded-2xl border border-separator bg-surface-secondary/30 p-4 text-sm text-muted">
                  Selecciona un día con movimiento para ver su detalle.
                </p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cerrar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

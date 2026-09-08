"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, toast } from "@heroui/react";
import Receipt from "@gravity-ui/icons/Receipt";
import Plus from "@gravity-ui/icons/Plus";
import { PageHeader } from "@/shared/components/ui";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { apiUrl } from "@/shared/utils/api";
import { formatDateTime } from "@/shared/utils/datetime-display";

type TemplateRow = {
  id: number;
  name: string;
  category: string | null;
  baseAmount: number;
  dueDayOfMonth: number | null;
  provider: string | null;
  isActive: boolean;
  occurrence: {
    id: number;
    amount: number;
    status: string;
    paidDate: string | null;
    dueDate: string | null;
  } | null;
};

export default function RecurringExpensesPage() {
  const [periodKey, setPeriodKey] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payAmounts, setPayAmounts] = useState<Record<number, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Gasto fijo",
    baseAmount: 0,
    dueDayOfMonth: 5,
    provider: "",
  });
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/finance/recurring-expenses"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as {
        periodKey?: string;
        templates?: TemplateRow[];
      };
      setPeriodKey(json.periodKey ?? "");
      const list = Array.isArray(json.templates) ? json.templates : [];
      setTemplates(list);
      const amounts: Record<number, number> = {};
      for (const t of list) {
        amounts[t.id] = t.occurrence?.amount || t.baseAmount || 0;
      }
      setPayAmounts(amounts);
    } catch {
      toast.danger("No se pudieron cargar gastos recurrentes");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pay = async (templateId: number) => {
    const amount = payAmounts[templateId] ?? 0;
    if (amount <= 0) {
      toast.danger("Indicá un monto mayor a 0");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/finance/recurring-expenses"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", templateId, amount }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Error");
      }
      toast.success("Gasto registrado en el ledger");
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al pagar");
    } finally {
      setPending(false);
    }
  };

  const createTemplate = async () => {
    if (!form.name.trim()) {
      toast.danger("Nombre requerido");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/finance/recurring-expenses"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error");
      toast.success("Plantilla creada");
      setShowForm(false);
      setForm({
        name: "",
        category: "Gasto fijo",
        baseAmount: 0,
        dueDayOfMonth: 5,
        provider: "",
      });
      await load();
    } catch {
      toast.danger("No se pudo crear");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        icon={<Receipt width={22} height={22} />}
        title="Gastos recurrentes"
        description={`Fijos del negocio: arriendo, luz, agua… Período ${periodKey || "—"}`}
        action={
          <Button variant="secondary" onPress={() => setShowForm((v) => !v)}>
            <Plus width={14} height={14} />
            Nueva plantilla
          </Button>
        }
      />

      {showForm ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-separator bg-surface p-4">
          <input
            className="rounded-xl border border-separator bg-field-background px-3 py-2 text-sm"
            placeholder="Nombre (ej. Arriendo local Centro)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="rounded-xl border border-separator bg-field-background px-3 py-2 text-sm"
            placeholder="Categoría"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <AppNumberField
            label="Monto base sugerido"
            minValue={0}
            value={form.baseAmount}
            onChange={(baseAmount) => setForm((f) => ({ ...f, baseAmount }))}
          />
          <AppNumberField
            label="Día de vencimiento (1–28)"
            minValue={1}
            maxValue={28}
            value={form.dueDayOfMonth}
            onChange={(dueDayOfMonth) =>
              setForm((f) => ({ ...f, dueDayOfMonth: dueDayOfMonth || 1 }))
            }
          />
          <Button
            variant="primary"
            isDisabled={pending}
            onPress={() => void createTemplate()}
          >
            Guardar plantilla
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((t) => {
            const paid = t.occurrence?.status === "paid";
            return (
              <li
                key={t.id}
                className="rounded-2xl border border-separator bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted">
                      {t.category ?? "Gasto fijo"}
                      {t.dueDayOfMonth
                        ? ` · vence día ${t.dueDayOfMonth}`
                        : ""}
                    </p>
                    {paid && t.occurrence?.paidDate ? (
                      <p className="mt-1 text-xs font-medium text-success">
                        Pagado {formatDateTime(t.occurrence.paidDate)} · $
                        {t.occurrence.amount.toFixed(2)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-warning">Pendiente este mes</p>
                    )}
                  </div>
                  {!paid ? (
                    <div className="flex flex-col items-end gap-2">
                      <AppNumberField
                        label="Monto a registrar"
                        minValue={0}
                        value={payAmounts[t.id] ?? 0}
                        onChange={(v) =>
                          setPayAmounts((m) => ({ ...m, [t.id]: v }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        isDisabled={pending}
                        onPress={() => void pay(t.id)}
                      >
                        Registrar pago
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

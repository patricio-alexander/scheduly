"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, toast } from "@heroui/react";
import Receipt from "@gravity-ui/icons/Receipt";
import Plus from "@gravity-ui/icons/Plus";
import { PageHeader, ContentCard } from "@/shared/components/ui";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { SelectField } from "@/shared/components/SelectField";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import { apiUrl } from "@/shared/utils/api";
import { formatDateTime } from "@/shared/utils/datetime-display";
import { formatMoney } from "@/shared/utils/money";

type BranchOpt = { id: number; name: string };

type TemplateRow = {
  id: number;
  storeId: number | null;
  branchName: string | null;
  name: string;
  category: string | null;
  baseAmount: number;
  dueDayOfMonth: number | null;
  provider: string | null;
  isActive: boolean;
  status: "paid" | "pending";
  statusLabel: string;
  amountThisMonth: number;
  occurrence: {
    id: number;
    amount: number;
    status: string;
    paidDate: string | null;
    dueDate: string | null;
  } | null;
};

const CATEGORY_PRESETS = [
  "Arriendo",
  "Servicios básicos",
  "Gasto fijo",
  "Mantenimiento",
];

export default function RecurringExpensesPage() {
  const [periodKey, setPeriodKey] = useState("");
  const [branches, setBranches] = useState<BranchOpt[]>([]);
  const [canFilterStores, setCanFilterStores] = useState(true);
  const [storeId, setStoreId] = useState<string>("all");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payAmounts, setPayAmounts] = useState<Record<number, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Arriendo",
    baseAmount: 0,
    dueDayOfMonth: 5,
    provider: "",
    storeId: "",
  });
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q =
        storeId === "all"
          ? ""
          : `?storeId=${encodeURIComponent(storeId)}`;
      const res = await fetch(apiUrl(`/api/finance/recurring-expenses${q}`), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as {
        periodKey?: string;
        branches?: BranchOpt[];
        templates?: TemplateRow[];
        canFilterStores?: boolean;
        lockedStoreId?: number | null;
        storeId?: number | null;
      };
      setPeriodKey(json.periodKey ?? "");
      const branchList = Array.isArray(json.branches) ? json.branches : [];
      setBranches(branchList);
      const filterOk = json.canFilterStores !== false;
      setCanFilterStores(filterOk);

      if (!filterOk && json.lockedStoreId != null) {
        const locked = String(json.lockedStoreId);
        if (storeId !== locked) setStoreId(locked);
      } else if (!filterOk && branchList.length === 1) {
        const only = String(branchList[0].id);
        if (storeId !== only) setStoreId(only);
      }

      const list = Array.isArray(json.templates) ? json.templates : [];
      setTemplates(
        list.map((t) => ({
          ...t,
          status: t.status ?? (t.occurrence?.status === "paid" ? "paid" : "pending"),
          statusLabel:
            t.statusLabel ??
            (t.occurrence?.status === "paid" ? "Pagado" : "Pendiente"),
          amountThisMonth:
            t.amountThisMonth ?? t.occurrence?.amount ?? t.baseAmount ?? 0,
        })),
      );
      const amounts: Record<number, number> = {};
      for (const t of list) {
        amounts[t.id] = t.occurrence?.amount || t.baseAmount || 0;
      }
      setPayAmounts(amounts);

      const defaultStore =
        (!filterOk && json.lockedStoreId != null
          ? String(json.lockedStoreId)
          : storeId !== "all"
            ? storeId
            : branchList[0]
              ? String(branchList[0].id)
              : "") || "";
      setForm((f) => ({
        ...f,
        storeId: f.storeId || defaultStore,
      }));
    } catch {
      toast.danger("No se pudieron cargar gastos recurrentes");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const branchOptions = useMemo(() => {
    const opts = branches.map((b) => ({
      id: String(b.id),
      label: b.name,
    }));
    if (canFilterStores || branches.length > 1) {
      return [{ id: "all", label: "Todos los locales" }, ...opts];
    }
    return opts;
  }, [branches, canFilterStores]);

  const formBranchOptions = useMemo(
    () => branches.map((b) => ({ id: String(b.id), label: b.name })),
    [branches],
  );

  const categoryOptions = useMemo(
    () => CATEGORY_PRESETS.map((c) => ({ id: c, label: c })),
    [],
  );

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
      toast.success("Gasto del local registrado en Finanzas");
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
    if (!form.storeId) {
      toast.danger("Elegí el local");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/finance/recurring-expenses"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          baseAmount: form.baseAmount,
          dueDayOfMonth: form.dueDayOfMonth,
          provider: form.provider || undefined,
          storeId: Number(form.storeId),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Error");
      }
      toast.success("Gasto fijo del local creado");
      setShowForm(false);
      setForm((f) => ({
        ...f,
        name: "",
        category: "Arriendo",
        baseAmount: 0,
        dueDayOfMonth: 5,
        provider: "",
      }));
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  };

  const showBranchColumn = canFilterStores || branches.length > 1;

  const columns = useMemo<TableProColumn<TemplateRow>[]>(
    () => [
      ...(showBranchColumn
        ? [
            {
              id: "branchName",
              label: "Local",
              getSortValue: (t: TemplateRow) =>
                (t.branchName ?? "").toLowerCase(),
              getSearchValue: (t: TemplateRow) => t.branchName ?? "",
              render: (t: TemplateRow) => (
                <span className="font-medium">{t.branchName ?? "—"}</span>
              ),
            } satisfies TableProColumn<TemplateRow>,
          ]
        : []),
      {
        id: "name",
        label: "Concepto",
        getSortValue: (t) => t.name.toLowerCase(),
        getSearchValue: (t) =>
          `${t.name} ${t.category ?? ""} ${t.provider ?? ""} ${t.branchName ?? ""}`,
        render: (t) => (
          <div className="min-w-0">
            <p className="font-medium">{t.name}</p>
            {t.provider ? (
              <p className="truncate text-xs text-muted">{t.provider}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "category",
        label: "Categoría",
        getSortValue: (t) => (t.category ?? "").toLowerCase(),
        render: (t) => (
          <span className="text-sm text-muted">{t.category ?? "—"}</span>
        ),
      },
      {
        id: "baseAmount",
        label: "Base",
        align: "right",
        getSortValue: (t) => t.baseAmount ?? 0,
        render: (t) => (
          <span className="tabular-nums text-sm">
            {t.baseAmount > 0 ? formatMoney(t.baseAmount) : "—"}
          </span>
        ),
      },
      {
        id: "dueDayOfMonth",
        label: "Vence",
        align: "right",
        getSortValue: (t) => t.dueDayOfMonth ?? 0,
        render: (t) => (
          <span className="tabular-nums text-sm">
            {t.dueDayOfMonth ? `Día ${t.dueDayOfMonth}` : "—"}
          </span>
        ),
      },
      {
        id: "statusLabel",
        label: "Estado",
        getSortValue: (t) => t.statusLabel,
        render: (t) => (
          <div>
            <span
              className={
                t.status === "paid"
                  ? "text-sm font-medium text-success"
                  : "text-sm font-medium text-warning"
              }
            >
              {t.statusLabel}
            </span>
            {t.status === "paid" && t.occurrence?.paidDate ? (
              <p className="text-[11px] text-muted">
                {formatDateTime(t.occurrence.paidDate)}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "amountThisMonth",
        label: "Monto mes",
        align: "right",
        getSortValue: (t) =>
          t.status === "paid"
            ? t.occurrence?.amount ?? 0
            : payAmounts[t.id] ?? t.amountThisMonth ?? 0,
        render: (t) =>
          t.status === "paid" ? (
            <span className="font-semibold tabular-nums">
              {formatMoney(t.occurrence?.amount ?? 0)}
            </span>
          ) : (
            <div className="flex justify-end">
              <AppNumberField
                aria-label={`Monto ${t.name}`}
                minValue={0}
                value={payAmounts[t.id] ?? 0}
                onChange={(v) =>
                  setPayAmounts((m) => ({ ...m, [t.id]: v }))
                }
              />
            </div>
          ),
      },
      {
        id: "actions",
        label: "Acción",
        sortable: false,
        align: "right",
        render: (t) =>
          t.status === "paid" ? (
            <span className="text-xs text-muted">OK</span>
          ) : (
            <Button
              size="sm"
              variant="primary"
              isDisabled={pending}
              onPress={() => void pay(t.id)}
            >
              Registrar
            </Button>
          ),
      },
    ],
    [showBranchColumn, payAmounts, pending],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        icon={<Receipt width={22} height={22} />}
        title="Gastos recurrentes"
        description={`Fijos por local (arriendo, luz, agua…). Mes ${periodKey || "—"}`}
        action={
          <Button variant="secondary" onPress={() => setShowForm((v) => !v)}>
            <Plus width={14} height={14} />
            Nuevo gasto fijo
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(14rem,18rem)_1fr] sm:items-end">
        <SelectField
          label="Local"
          placeholder="Elegí local"
          selectedKey={storeId}
          onSelectionChange={(key) => {
            if (!key) return;
            if (!canFilterStores && branches.length === 1) return;
            setStoreId(key);
          }}
          options={branchOptions}
          isDisabled={!canFilterStores && branches.length <= 1}
        />
        <p className="text-[11px] text-muted sm:pb-2">
          {canFilterStores
            ? "Como dueña podés ver todos los locales o filtrar uno. Ordená columnas y buscá por concepto."
            : "Solo ves los gastos fijos de tu(s) local(es) vinculado(s)."}
        </p>
      </div>

      {showForm ? (
        <ContentCard>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm font-semibold">Nuevo gasto fijo del local</p>
            <SelectField
              label="Local"
              placeholder="Elegí local…"
              selectedKey={form.storeId || null}
              onSelectionChange={(key) =>
                setForm((f) => ({ ...f, storeId: key ?? "" }))
              }
              options={formBranchOptions}
            />
            <input
              className="h-10 rounded-xl border border-separator bg-field-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Nombre (ej. Arriendo, Luz, Agua)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <SelectField
              label="Categoría"
              selectedKey={form.category}
              onSelectionChange={(key) =>
                setForm((f) => ({ ...f, category: key ?? "Gasto fijo" }))
              }
              options={categoryOptions}
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
            <input
              className="h-10 rounded-xl border border-separator bg-field-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Proveedor / arrendador (opcional)"
              value={form.provider}
              onChange={(e) =>
                setForm((f) => ({ ...f, provider: e.target.value }))
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                isDisabled={pending}
                onPress={() => void createTemplate()}
              >
                Guardar gasto del local
              </Button>
              <Button variant="ghost" onPress={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </ContentCard>
      ) : null}

      <TablePro
        columns={columns}
        rows={templates}
        getRowId={(t) => t.id}
        loading={loading}
        searchPlaceholder="Buscar local, concepto, categoría…"
        emptyMessage={
          branches.length === 0
            ? "No tenés locales asignados"
            : "No hay gastos fijos para este filtro"
        }
        defaultRowsPerPage={10}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </div>
  );
}

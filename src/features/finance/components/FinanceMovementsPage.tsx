"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Label,
  Modal,
  toast,
  useOverlayState,
} from "@heroui/react";
import Plus from "@gravity-ui/icons/Plus";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import ArrowShapeUp from "@gravity-ui/icons/ArrowShapeUp";
import ArrowShapeDown from "@gravity-ui/icons/ArrowShapeDown";
import { SelectField } from "@/shared/components/SelectField";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatMoney } from "@/shared/utils/money";
import {
  FinanceSummaryCards,
  type FinanceSummaryData,
} from "./FinanceSummaryCards";

type LedgerRow = {
  id: number;
  date: string;
  amount: number;
  concept: string;
  category: string;
  persisted?: boolean;
};

type MovRow = LedgerRow & {
  type: "income" | "expense";
  sourceId: number;
  rowKey: string;
};

const INCOME_CATS = ["Venta", "Donación", "Carrera", "Servicio", "Otro"];
const EXPENSE_CATS = [
  "Pago de servicios",
  "Compra de insumos",
  "Honorarios",
  "Pago Empleados",
  "Otro",
];

function formatDateLabel(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function FinanceMovementsPage() {
  const formModal = useOverlayState();
  const deleteModal = useOverlayState();
  const [summary, setSummary] = useState<FinanceSummaryData | null>(null);
  const [incomes, setIncomes] = useState<LedgerRow[]>([]);
  const [expenses, setExpenses] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [editId, setEditId] = useState<number | null>(null);
  const [formDate, setFormDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [formAmount, setFormAmount] = useState(0);
  const [formConcept, setFormConcept] = useState("");
  const [formCategory, setFormCategory] = useState("Venta");
  const [pending, setPending] = useState(false);
  const [toDelete, setToDelete] = useState<MovRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, iRes, eRes] = await Promise.all([
        fetch(apiUrl("/api/finance/ledger-summary"), {
          credentials: "include",
        }),
        fetch(apiUrl("/api/finance/incomes"), { credentials: "include" }),
        fetch(apiUrl("/api/finance/expenses-ledger"), {
          credentials: "include",
        }),
      ]);

      if (sRes.ok) {
        setSummary((await sRes.json()) as FinanceSummaryData);
      } else {
        setSummary(null);
      }

      if (iRes.ok) {
        const json: unknown = await iRes.json();
        setIncomes(Array.isArray(json) ? (json as LedgerRow[]) : []);
      } else {
        setIncomes([]);
      }

      if (eRes.ok) {
        const json: unknown = await eRes.json();
        setExpenses(Array.isArray(json) ? (json as LedgerRow[]) : []);
      } else {
        setExpenses([]);
      }

      if (!sRes.ok && !iRes.ok && !eRes.ok) {
        throw new Error("No se pudo cargar finanzas");
      }
      if (!sRes.ok || !iRes.ok || !eRes.ok) {
        toast.danger("Algunas secciones de finanzas no cargaron");
      }
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allRows = useMemo(() => {
    const incomeRows: MovRow[] = incomes.map((i) => ({
      ...i,
      type: "income",
      sourceId: i.id,
      rowKey: `income-${i.id}`,
    }));
    const expenseRows: MovRow[] = expenses.map((e) => ({
      ...e,
      type: "expense",
      sourceId: e.id,
      rowKey: `expense-${e.id}`,
    }));
    return [...incomeRows, ...expenseRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [incomes, expenses]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      const c = String(r.category || "").trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (typeFilter === "income" && r.type !== "income") return false;
      if (typeFilter === "expense" && r.type !== "expense") return false;
      if (
        categoryFilter !== "all" &&
        String(r.category || "") !== categoryFilter
      ) {
        return false;
      }
      return true;
    });
  }, [allRows, typeFilter, categoryFilter]);

  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of filteredRows) {
      if (r.type === "income") income += r.amount;
      else expense += r.amount;
    }
    return {
      income: Number(income.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      balance: Number((income - expense).toFixed(2)),
    };
  }, [filteredRows]);

  const openCreate = (type: "income" | "expense") => {
    setFormType(type);
    setEditId(null);
    setFormAmount(0);
    setFormConcept("");
    setFormCategory(type === "income" ? "Venta" : "Compra de insumos");
    setFormDate(new Date().toISOString().slice(0, 10));
    formModal.open();
  };

  const openEdit = (row: MovRow) => {
    if (row.persisted === false || row.id < 0) {
      toast.danger("Este movimiento viene de una venta/cita; no se edita aquí");
      return;
    }
    setFormType(row.type);
    setEditId(row.sourceId);
    setFormAmount(Number(row.amount) || 0);
    setFormConcept(row.concept || "");
    setFormCategory(row.category || (row.type === "income" ? "Venta" : "Otro"));
    setFormDate(
      row.date
        ? new Date(row.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
    formModal.open();
  };

  const saveForm = async () => {
    if (formAmount <= 0) {
      toast.danger("Ingresa un monto válido");
      return;
    }
    setPending(true);
    try {
      const base =
        formType === "income"
          ? "/api/finance/incomes"
          : "/api/finance/expenses-ledger";
      const url = editId != null ? apiUrl(`${base}/${editId}`) : apiUrl(base);
      const res = await fetch(url, {
        method: editId != null ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: formAmount,
          concept: formConcept,
          category: formCategory,
          date: formDate,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!res.ok) throw new Error(json?.message ?? "No se pudo guardar");
      toast.success(
        editId != null
          ? "Movimiento actualizado"
          : formType === "income"
            ? "Ingreso registrado"
            : "Gasto registrado",
      );
      formModal.close();
      await load();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setPending(true);
    try {
      const url =
        toDelete.type === "income"
          ? apiUrl(`/api/finance/incomes/${toDelete.sourceId}`)
          : apiUrl(`/api/finance/expenses-ledger/${toDelete.sourceId}`);
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar");
      toast.success("Eliminado");
      deleteModal.close();
      setToDelete(null);
      await load();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  };

  const columns: TableProColumn<MovRow>[] = [
      {
        id: "date",
        label: "Fecha",
        getSortValue: (r) => new Date(r.date || 0).getTime(),
        getSearchValue: (r) => formatDateLabel(r.date),
        render: (r) => (
          <span className="whitespace-nowrap text-xs">
            {formatDateLabel(r.date)}
          </span>
        ),
      },
      {
        id: "type",
        label: "Tipo",
        getSortValue: (r) => r.type,
        getSearchValue: (r) => (r.type === "income" ? "Ingreso" : "Gasto"),
        render: (r) =>
          r.type === "income" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-semibold text-success">
              <ArrowShapeUp width={12} height={12} />
              Ingreso
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/20 px-2 py-0.5 text-[11px] font-semibold text-danger">
              <ArrowShapeDown width={12} height={12} />
              Gasto
            </span>
          ),
      },
      {
        id: "concept",
        label: "Concepto",
        getSortValue: (r) => (r.concept || "").toLowerCase(),
        getSearchValue: (r) => r.concept,
        render: (r) => (
          <span className="max-w-[18rem] truncate">{r.concept || "—"}</span>
        ),
      },
      {
        id: "category",
        label: "Categoría",
        getSortValue: (r) => (r.category || "").toLowerCase(),
        getSearchValue: (r) => r.category,
        render: (r) => (
          <span className="text-muted">{r.category || "—"}</span>
        ),
      },
      {
        id: "amount",
        label: "Monto",
        align: "right",
        getSortValue: (r) => Number(r.amount || 0),
        getSearchValue: (r) => r.amount,
        render: (r) => (
          <span
            className={`font-bold tabular-nums ${
              r.type === "income" ? "text-success" : "text-danger"
            }`}
          >
            {r.type === "expense" ? "−" : "+"}
            {formatMoney(r.amount)}
          </span>
        ),
      },
      {
        id: "actions",
        label: "Acciones",
        align: "center",
        sortable: false,
        getSearchValue: () => "",
        render: (r) => {
          const canEdit = r.persisted !== false && r.id > 0;
          if (!canEdit) {
            return (
              <span className="text-xs text-muted" title="Generado por venta/cita">
                auto
              </span>
            );
          }
          return (
            <div className="flex justify-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Editar"
                onPress={() => openEdit(r)}
              >
                <Pencil width={14} height={14} />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="danger"
                aria-label="Eliminar"
                onPress={() => {
                  setToDelete(r);
                  deleteModal.open();
                }}
              >
                <TrashBin width={14} height={14} />
              </Button>
            </div>
          );
        },
      },
    ];

  const formCats = formType === "income" ? INCOME_CATS : EXPENSE_CATS;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          Finanzas
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Resumen de ingresos y gastos registrados. El detalle de cobros está
          en{" "}
          <a
            href={appRoutes.finance.collections}
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            Finanzas → Cobranzas
          </a>
          .
        </p>
      </div>

      <FinanceSummaryCards summary={summary} loading={loading} />

      <div className="border-t border-separator" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold">Movimientos</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
              Ingresos {formatMoney(filteredTotals.income)}
            </span>
            <span className="rounded-full border border-danger/40 bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold text-danger">
              Gastos {formatMoney(filteredTotals.expense)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                filteredTotals.balance >= 0
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-warning/40 bg-warning/10 text-[var(--warning)]"
              }`}
            >
              Balance filtro {formatMoney(filteredTotals.balance)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => openCreate("income")}
          >
            <Plus width={14} height={14} />
            Ingreso
          </Button>
          <Button
            size="sm"
            variant="danger"
            onPress={() => openCreate("expense")}
          >
            <Plus width={14} height={14} />
            Gasto
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="inline-flex overflow-hidden rounded-xl border border-separator">
          {(
            [
              ["all", "Todos"],
              ["income", "Solo ingresos"],
              ["expense", "Solo gastos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-1.5 text-xs font-semibold ${
                typeFilter === id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:bg-surface-secondary"
              }`}
              onClick={() => setTypeFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <SelectField
          label="Categoría"
          className="w-full sm:w-[200px]"
          selectedKey={categoryFilter}
          onSelectionChange={(key) => setCategoryFilter(key ?? "all")}
          options={[
            { id: "all", label: "Todas" },
            ...categoryOptions.map((c) => ({ id: c, label: c })),
          ]}
        />
      </div>

      <TablePro
        columns={columns}
        rows={filteredRows}
        getRowId={(r) => r.rowKey}
        loading={loading}
        searchPlaceholder="Buscar concepto, categoría, tipo…"
        emptyMessage="Sin movimientos"
        dense
        defaultRowsPerPage={10}
        rowsPerPageOptions={[10, 25, 50]}
      />

      <Modal state={formModal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {editId != null
                    ? `Editar ${formType === "income" ? "ingreso" : "gasto"}`
                    : formType === "income"
                      ? "Registrar ingreso"
                      : "Registrar gasto"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-3">
                  <div>
                    <Label className="mb-1">Fecha</Label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                  <AppNumberField
                    label="Monto"
                    value={formAmount}
                    minValue={0.01}
                    step={0.01}
                    onChange={setFormAmount}
                  />
                  <div>
                    <Label className="mb-1">Concepto</Label>
                    <Input
                      value={formConcept}
                      onChange={(e) => setFormConcept(e.target.value)}
                      placeholder="Descripción"
                    />
                  </div>
                  <SelectField
                    label="Categoría"
                    selectedKey={formCategory}
                    onSelectionChange={(key) =>
                      setFormCategory(key ?? formCats[0])
                    }
                    options={formCats.map((c) => ({ id: c, label: c }))}
                  />
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => formModal.close()}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isDisabled={pending}
                  onPress={() => void saveForm()}
                >
                  {pending ? "Guardando…" : "Guardar"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={deleteModal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Eliminar registro</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  ¿Está seguro de eliminar este registro?
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => {
                    deleteModal.close();
                    setToDelete(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  isDisabled={pending}
                  onPress={() => void confirmDelete()}
                >
                  Eliminar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

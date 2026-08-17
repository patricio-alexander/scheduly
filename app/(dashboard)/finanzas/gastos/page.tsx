"use client";

import { useEffect, useState } from "react";
import { Button, Label, toast } from "@heroui/react";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import { PageHeader } from "@/shared/components/ui";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { SelectField } from "@/shared/components/SelectField";
import { BranchSelector, useBranches } from "@/src/features/branches";
import { useAuth } from "@/src/features/auth";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { paymentMethodOptions, paymentMethodLabel } from "@/shared/utils/payment-methods";
import { isOwnerRole } from "@/shared/utils/roles";

type ExpenseCategory = { id: number; name: string; type: string };
type ExpenseRow = {
  id: number;
  amount: number;
  description: string;
  method: string;
  expenseDate: string;
  category: ExpenseCategory;
  branch: { id: number; name: string } | null;
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const { branches } = useBranches();
  const owner = user ? isOwnerRole(user.role) : false;
  const lockedBranch = user?.branch ?? null;
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [form, setForm] = useState({
    amount: "",
    categoryId: "",
    branchId: "all" as number | "all",
    method: "cash",
    description: "",
  });
  const [pending, setPending] = useState(false);

  const effectiveBranchId =
    owner || !lockedBranch
      ? form.branchId === "all"
        ? null
        : form.branchId
      : lockedBranch.id;

  const load = async () => {
    const res = await fetch(apiUrl("/api/expenses?period=month"), {
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      setCategories(json.categories ?? []);
      setExpenses(json.expenses ?? []);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner && !lockedBranch) {
      toast.danger("No tienes una sucursal asignada");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/expenses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: Number(form.amount),
          categoryId: Number(form.categoryId),
          branchId: effectiveBranchId,
          method: form.method,
          description: form.description,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          json && typeof json === "object" && "message" in json
            ? String((json as { message: unknown }).message)
            : "No se pudo registrar el gasto",
        );
      }
      toast.success("Gasto registrado");
      setForm({
        amount: "",
        categoryId: "",
        branchId: owner ? "all" : lockedBranch!.id,
        method: "cash",
        description: "",
      });
      await load();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  };

  if (!user) return null;

  const branchScoped = !owner && lockedBranch;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        icon={<ChartColumn width={24} height={24} />}
        title="Gastos operativos"
        description={
          branchScoped
            ? `Insumos, servicios y costos de ${lockedBranch.name}`
            : "Insumos, alquiler, servicios y otros costos"
        }
      />

      <form
        onSubmit={submit}
        className="grid gap-4 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-2"
      >
        <AppNumberField
          label="Monto"
          minValue={0}
          step={0.01}
          isRequired
          value={form.amount === "" ? undefined : Number(form.amount)}
          onChange={(amount) => setForm((f) => ({ ...f, amount: String(amount) }))}
        />
        <SelectField
          label="Categoría"
          placeholder="Seleccionar..."
          selectedKey={form.categoryId || null}
          onSelectionChange={(key) =>
            setForm((f) => ({ ...f, categoryId: key ?? "" }))
          }
          options={categories.map((c) => ({
            id: String(c.id),
            label: c.name,
          }))}
        />
        {owner ? (
          <BranchSelector
            label="Sucursal"
            branches={branches}
            value={form.branchId}
            onChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
          />
        ) : (
          <div>
            <Label className="text-sm font-medium">Sucursal</Label>
            <p className="mt-2 rounded-xl border border-separator bg-surface-secondary/40 px-3 py-2.5 text-sm">
              {lockedBranch ? lockedBranch.name : "Sin sucursal asignada"}
            </p>
          </div>
        )}
        <SelectField
          label="Método"
          selectedKey={form.method}
          onSelectionChange={(key) =>
            setForm((f) => ({ ...f, method: key ?? "cash" }))
          }
          options={paymentMethodOptions.map((m) => ({
            id: m,
            label: paymentMethodLabel[m],
          }))}
        />
        <div className="sm:col-span-2">
          <Label className="text-sm font-medium">Descripción</Label>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-separator px-3 py-2"
            placeholder="Detalle del gasto..."
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" isDisabled={pending}>
            {pending ? "Guardando..." : "Registrar gasto"}
          </Button>
        </div>
      </form>

      <section className="rounded-2xl border border-separator bg-surface p-4">
        <h2 className="mb-4 font-semibold">
          {branchScoped ? `Gastos del mes · ${lockedBranch.name}` : "Gastos del mes"}
        </h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted">Sin gastos registrados.</p>
        ) : (
          <ul className="divide-y divide-separator">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{expense.category.name}</p>
                  <p className="text-muted">
                    {expense.description || "—"}
                    {owner ? ` · ${expense.branch?.name ?? "General"}` : null}
                  </p>
                </div>
                <span className="font-semibold tabular-nums text-danger">
                  {formatMoney(expense.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

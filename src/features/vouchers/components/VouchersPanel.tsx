"use client";

import { useMemo, useState } from "react";
import { Button, toast, useOverlayState } from "@heroui/react";
import HandCoins from "@gravity-ui/icons/CreditCard";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import ArrowRotateLeft from "@gravity-ui/icons/ArrowRotateLeft";
import TrashBin from "@gravity-ui/icons/TrashBin";
import Person from "@gravity-ui/icons/Person";
import { Skeleton } from "@/shared/components/ui";
import { useAuth } from "@/src/features/auth";
import { isManagementRole } from "@/shared/utils/roles";
import { formatMoney } from "@/shared/utils/money";
import {
  dashboardPeriodLabel,
  dashboardPeriodOptions,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { paymentMethodLabel } from "@/shared/utils/payment-methods";
import { useVouchers } from "../hooks/useVouchers";
import {
  deleteVoucher,
  setVoucherSettled,
} from "../services/voucher-service";
import type { VoucherEmployee } from "../types";
import { RegisterVoucherModal } from "./RegisterVoucherModal";

function Metric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "success" | "accent";
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : tone === "accent"
          ? "text-accent"
          : "text-foreground";
  return (
    <div className="dashboard-metric">
      <p className="dashboard-metric__label">{label}</p>
      <p className={`dashboard-metric__value ${toneClass}`}>{value}</p>
      {hint ? <p className="dashboard-metric__hint">{hint}</p> : null}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
}

export function VouchersPanel() {
  const { user } = useAuth();
  // `adminOnly` solo esconde el ítem del menú: la URL sigue siendo alcanzable.
  const canView = user ? isManagementRole(user.role) : false;
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const { data, loading, error, refetch } = useVouchers({
    period,
    enabled: canView,
  });
  const [target, setTarget] = useState<VoucherEmployee | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const modal = useOverlayState();

  const employees = data?.employees ?? [];
  const items = data?.items ?? [];
  const withPending = useMemo(
    () => employees.filter((e) => e.pendingAmount > 0),
    [employees],
  );

  const openFor = (employee: VoucherEmployee | null) => {
    setTarget(employee);
    modal.open();
  };

  const toggleSettled = async (id: number, settled: boolean) => {
    setBusyId(id);
    try {
      await setVoucherSettled(id, settled);
      toast.success(settled ? "Vale marcado como descontado" : "Vale pendiente");
      await refetch();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    setBusyId(id);
    try {
      await deleteVoucher(id);
      toast.success("Vale anulado");
      await refetch();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al anular");
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  if (!canView) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        Solo dueño/administración pueden ver los vales de los empleados.
      </div>
    );
  }

  return (
    <div className="vouchers-page mx-auto flex w-full max-w-[1400px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">
            Vales
          </h1>
          <p className="text-sm text-muted">
            Adelantos de sueldo. Se descuentan en la liquidación semanal.
          </p>
        </div>
        <Button variant="primary" onPress={() => openFor(null)}>
          <HandCoins width={16} height={16} />
          Nuevo vale
        </Button>
      </div>

      <div className="dashboard-period" role="group" aria-label="Período">
        {dashboardPeriodOptions.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={period === option}
            onClick={() => setPeriod(option)}
            className={`dashboard-period__btn sm:flex-none ${
              period === option ? "dashboard-period__btn--active" : ""
            }`}
          >
            {dashboardPeriodLabel[option]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="dashboard-card p-4 text-sm text-danger">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            <Metric
              label="Pendiente de descontar"
              value={formatMoney(data?.totals.pendingTotal ?? 0)}
              hint="Histórico, sin importar el período"
              tone="warning"
            />
            <Metric
              label="Dado en el período"
              value={formatMoney(data?.totals.periodTotal ?? 0)}
              hint={`${data?.totals.count ?? 0} vale${
                data?.totals.count === 1 ? "" : "s"
              }`}
            />
            <Metric
              label="Ya descontado"
              value={formatMoney(data?.totals.periodSettled ?? 0)}
              hint="Del período visible"
              tone="success"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="dashboard-card min-w-0 xl:col-span-5">
              <div className="dashboard-card-header">
                <h2 className="text-base font-semibold">Deben vales</h2>
                <span className="text-sm text-muted">
                  {withPending.length} empleado
                  {withPending.length === 1 ? "" : "s"}
                </span>
              </div>
              {withPending.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  Nadie tiene vales sin descontar.
                </p>
              ) : (
                <ul className="divide-y divide-separator">
                  {withPending.map((employee) => (
                    <li
                      key={employee.personId}
                      className="flex items-center justify-between gap-2 px-4 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-muted">
                          <Person width={14} height={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium">
                            {employee.name}
                          </p>
                          <p className="text-xs text-muted">
                            {employee.pendingCount} vale
                            {employee.pendingCount === 1 ? "" : "s"}
                            {employee.branch ? ` · ${employee.branch.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-base font-bold tabular-nums text-warning">
                          {formatMoney(employee.pendingAmount)}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => openFor(employee)}
                        >
                          Otro
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dashboard-card min-w-0 xl:col-span-7">
              <div className="dashboard-card-header">
                <h2 className="text-base font-semibold">Vales del período</h2>
                <span className="text-sm text-muted">
                  {dashboardPeriodLabel[period]}
                </span>
              </div>
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <HandCoins
                    width={24}
                    height={24}
                    className="mx-auto mb-1 text-muted opacity-40"
                  />
                  <p className="text-base font-medium">Sin vales en el período</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Registrá uno con el botón «Nuevo vale».
                  </p>
                </div>
              ) : (
                <div className="max-h-[30rem] overflow-auto">
                  <table className="pos-table min-w-[560px]">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Empleado</th>
                        <th>Entrega</th>
                        <th className="text-right">Monto</th>
                        <th className="text-center">Estado</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((voucher) => {
                        const busy = busyId === voucher.id;
                        const settled = Boolean(voucher.settledAt);
                        return (
                          <tr key={voucher.id}>
                            <td className="whitespace-nowrap text-muted">
                              {formatDate(voucher.issuedAt)}
                            </td>
                            <td className="font-medium">
                              {voucher.employee.name}
                              {voucher.reason ? (
                                <span className="block text-xs font-normal text-muted">
                                  {voucher.reason}
                                </span>
                              ) : null}
                            </td>
                            <td className="text-muted">
                              {paymentMethodLabel[voucher.method] ??
                                voucher.method}
                            </td>
                            <td className="text-right font-semibold tabular-nums">
                              {formatMoney(voucher.amount)}
                            </td>
                            <td className="text-center">
                              <span
                                className={`pos-chip ${
                                  settled ? "pos-chip--ok" : "pos-chip--warn"
                                }`}
                              >
                                {settled ? "Descontado" : "Pendiente"}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="ghost"
                                  isDisabled={busy}
                                  aria-label={
                                    settled
                                      ? "Volver a pendiente"
                                      : "Marcar como descontado"
                                  }
                                  onPress={() =>
                                    void toggleSettled(voucher.id, !settled)
                                  }
                                >
                                  {settled ? (
                                    <ArrowRotateLeft width={13} height={13} />
                                  ) : (
                                    <CircleCheck width={13} height={13} />
                                  )}
                                </Button>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="ghost"
                                  isDisabled={busy || settled}
                                  aria-label="Anular vale"
                                  onPress={() => void remove(voucher.id)}
                                >
                                  <TrashBin width={13} height={13} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <RegisterVoucherModal
        employees={employees}
        employee={target}
        branchId={data?.branchId ?? null}
        modal={modal}
        onClose={() => modal.close()}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}

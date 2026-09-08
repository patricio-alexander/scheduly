"use client";

import { Fragment, useMemo, useState } from "react";
import { Button, Label, SearchField, Table, useOverlayState } from "@heroui/react";
import Persons from "@gravity-ui/icons/Persons";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import { formatMoney } from "@/shared/utils/money";
import { paymentMethodLabel } from "@/shared/utils/payment-methods";
import {
  dashboardPeriodLabel,
  dashboardPeriodOptions,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import type { PayrollEmployee } from "../types";
import { RegisterEmployeePaymentModal } from "./RegisterEmployeePaymentModal";

const PAGE_SIZE = 10;

interface Props {
  employees: PayrollEmployee[];
  totalCommissions: number;
  totalPaid: number;
  totalPending: number;
  branchId: number | null;
  loading?: boolean;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  onPaymentRegistered: () => void;
  showBranch?: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString("es-CL", { day: "numeric", month: "short" })} · ${date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function statusLabel(employee: PayrollEmployee) {
  if (employee.commissionTotal <= 0) {
    return employee.paidTotal > 0 ? "Pagado" : "Sin comisiones";
  }
  if (employee.paidTotal > 0) return "Pago parcial";
  return "Pendiente";
}

export function PayrollList({
  employees,
  totalCommissions,
  totalPaid,
  totalPending,
  branchId,
  loading,
  period,
  onPeriodChange,
  onPaymentRegistered,
  showBranch = false,
}: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [paymentEmployee, setPaymentEmployee] = useState<PayrollEmployee | null>(
    null,
  );
  const paymentModal = useOverlayState();

  const openPaymentModal = (employee: PayrollEmployee) => {
    setPaymentEmployee(employee);
    paymentModal.open();
  };

  const closePaymentModal = () => {
    paymentModal.close();
    setPaymentEmployee(null);
  };

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) => {
      const nameMatch = employee.name.toLowerCase().includes(q);
      const branchMatch = employee.branch?.name.toLowerCase().includes(q) ?? false;
      return nameMatch || branchMatch;
    });
  }, [employees, search]);

  const table = useReactTable({
    data: filteredEmployees,
    columns: [{ accessorKey: "userId" as const, header: "Empleado" }],
    pageCount: Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE)),
    state: { pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE } },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize: PAGE_SIZE })
          : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageRows = table.getRowModel().rows;
  const pendingCount = useMemo(
    () => employees.filter((e) => e.pendingAmount > 0).length,
    [employees],
  );

  if (loading) {
    return (
      <ContentCard>
        <TableSkeleton />
      </ContentCard>
    );
  }

  return (
    <>
      <ContentCard>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div>
            <Label>Período</Label>
            <div className="mt-1 inline-flex rounded-xl border border-separator p-1">
              {dashboardPeriodOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onPeriodChange(option);
                    setPage(1);
                    setExpandedId(null);
                  }}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    period === option
                      ? "bg-accent text-accent-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {dashboardPeriodLabel[option]}
                </button>
              ))}
            </div>
          </div>

          {employees.length > 0 ? (
            <SearchField
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
                setExpandedId(null);
              }}
            >
              <Label>Buscar empleado</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  className="w-full sm:w-[320px]"
                  placeholder="Nombre del empleado..."
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3">
              <p className="text-xs text-muted">Comisiones</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatMoney(totalCommissions)}
              </p>
            </div>
            <div className="rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3">
              <p className="text-xs text-muted">Pagado</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
                {formatMoney(totalPaid)}
              </p>
            </div>
            <div className="rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3">
              <p className="text-xs text-muted">Pendiente</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-accent">
                {formatMoney(totalPending)}
              </p>
            </div>
            <div className="rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3">
              <p className="text-xs text-muted">Por pagar</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{pendingCount}</p>
            </div>
          </div>

          {employees.length === 0 ? (
            <EmptyState
              icon={<Persons width={40} height={40} />}
              title="Sin empleados"
              description="No hay estilistas asignados a esta sucursal."
            />
          ) : filteredEmployees.length === 0 ? (
            <EmptyState
              icon={<Persons width={40} height={40} />}
              title="Sin resultados"
              description={`No se encontró ningún empleado con "${search.trim()}".`}
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2 md:hidden">
                {pageRows.map((row) => {
                  const employee = row.original;
                  const expanded = expandedId === employee.userId;
                  return (
                    <li
                      key={employee.userId}
                      className="rounded-2xl border border-separator bg-surface-secondary/40"
                    >
                      <div className="flex items-start justify-between gap-3 px-4 py-3">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() =>
                            setExpandedId(expanded ? null : employee.userId)
                          }
                        >
                          <p className="font-semibold">{employee.name}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {statusLabel(employee)} · Pendiente{" "}
                            {formatMoney(employee.pendingAmount)}
                          </p>
                        </button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => openPaymentModal(employee)}
                        >
                          Pagar
                        </Button>
                      </div>
                      {expanded ? (
                        <div className="border-t border-separator px-4 py-2 text-xs">
                          {employee.commissionLines.length > 0 ? (
                            <p className="mb-2 font-medium text-muted">Comisiones</p>
                          ) : null}
                          {employee.commissionLines.map((line) => (
                            <div
                              key={line.appointmentId}
                              className="flex justify-between gap-2 py-1"
                            >
                              <span className="truncate">
                                {formatDate(line.appointmentDate)} · {line.title}
                              </span>
                              <span className="tabular-nums">{formatMoney(line.amount)}</span>
                            </div>
                          ))}
                          {employee.payments.length > 0 ? (
                            <p className="mb-2 mt-3 font-medium text-muted">Pagos</p>
                          ) : null}
                          {employee.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex justify-between gap-2 py-1 text-emerald-700"
                            >
                              <span>
                                {formatDateTime(payment.paidAt)} ·{" "}
                                {paymentMethodLabel[payment.method]}
                              </span>
                              <span className="tabular-nums">
                                {formatMoney(payment.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Sueldos por empleado" className="min-w-[880px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Empleado</Table.Column>
                        {showBranch ? <Table.Column>Sucursal</Table.Column> : null}
                        <Table.Column>Comisiones</Table.Column>
                        <Table.Column>Pagado</Table.Column>
                        <Table.Column>Pendiente</Table.Column>
                        <Table.Column>Estado</Table.Column>
                        <Table.Column>Acción</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {pageRows.map((row) => {
                          const employee = row.original;
                          const expanded = expandedId === employee.userId;
                          return (
                            <Fragment key={employee.userId}>
                              <Table.Row>
                                <Table.Cell>
                                  <button
                                    type="button"
                                    className="text-left font-medium hover:text-accent"
                                    onClick={() =>
                                      setExpandedId(
                                        expanded ? null : employee.userId,
                                      )
                                    }
                                  >
                                    {employee.name}
                                  </button>
                                </Table.Cell>
                                {showBranch ? (
                                  <Table.Cell className="text-muted">
                                    {employee.branch?.name ?? "—"}
                                  </Table.Cell>
                                ) : null}
                                <Table.Cell>
                                  <span className="tabular-nums">
                                    {formatMoney(employee.commissionTotal)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className="tabular-nums text-emerald-600">
                                    {formatMoney(employee.paidTotal)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className="font-semibold tabular-nums text-accent">
                                    {formatMoney(employee.pendingAmount)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                      employee.isFullyPaid
                                        ? "bg-emerald-500/15 text-emerald-700"
                                        : employee.pendingAmount > 0
                                          ? "bg-warning/15 text-warning"
                                          : "bg-surface-secondary text-muted"
                                    }`}
                                  >
                                    {statusLabel(employee)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onPress={() => openPaymentModal(employee)}
                                  >
                                    Registrar pago
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                              {expanded ? (
                                <Table.Row>
                                  <Table.Cell
                                    colSpan={showBranch ? 7 : 6}
                                    className="bg-surface-secondary/30"
                                  >
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                          Comisiones por turno
                                        </p>
                                        {employee.commissionLines.length === 0 ? (
                                          <p className="text-sm text-muted">Sin comisiones</p>
                                        ) : (
                                          <ul className="space-y-1 text-sm">
                                            {employee.commissionLines.map((line) => (
                                              <li
                                                key={line.appointmentId}
                                                className="flex justify-between gap-2"
                                              >
                                                <span>
                                                  {formatDate(line.appointmentDate)} ·{" "}
                                                  {line.title}
                                                </span>
                                                <span className="tabular-nums">
                                                  {formatMoney(line.amount)}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                      <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                          Pagos registrados
                                        </p>
                                        {employee.payments.length === 0 ? (
                                          <p className="text-sm text-muted">Sin pagos</p>
                                        ) : (
                                          <ul className="space-y-1 text-sm">
                                            {employee.payments.map((payment) => (
                                              <li
                                                key={payment.id}
                                                className="flex justify-between gap-2"
                                              >
                                                <span>
                                                  {formatDateTime(payment.paidAt)} ·{" "}
                                                  {paymentMethodLabel[payment.method]} ·{" "}
                                                  {payment.registeredBy.name}
                                                </span>
                                                <span className="font-medium tabular-nums text-emerald-600">
                                                  {formatMoney(payment.amount)}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    </div>
                                  </Table.Cell>
                                </Table.Row>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </div>
            </>
          )}
        </div>
      </ContentCard>

      <RegisterEmployeePaymentModal
        employee={paymentEmployee}
        branchId={branchId}
        period={period}
        modal={paymentModal}
        onClose={closePaymentModal}
        onSuccess={onPaymentRegistered}
      />
    </>
  );
}

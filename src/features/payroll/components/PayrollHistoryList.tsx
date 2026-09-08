"use client";

import { useEffect, useState } from "react";
import { Pagination, SearchField, Label } from "@heroui/react";
import Wallet from "@gravity-ui/icons/Wallet";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import { formatMoney } from "@/shared/utils/money";
import { paymentMethodLabel } from "@/shared/utils/payment-methods";
import {
  dashboardPeriodLabel,
  dashboardPeriodOptions,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import type { PayrollPaymentLogEntry } from "../types";

const PAGE_SIZE = 15;

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("es-EC", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

interface Props {
  payments: PayrollPaymentLogEntry[];
  loading?: boolean;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  totalCount: number;
  totalAmount: number;
  showBranch?: boolean;
}

export function PayrollHistoryList({
  payments,
  loading,
  period,
  onPeriodChange,
  search,
  onSearchChange,
  page,
  onPageChange,
  totalCount,
  totalAmount,
  showBranch = false,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      onPageChange(totalPages);
    }
  }, [page, totalPages, onPageChange]);

  if (loading) {
    return (
      <ContentCard>
        <div className="p-4 sm:p-6">
          <TableSkeleton rows={6} />
        </div>
      </ContentCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-separator bg-surface p-4">
        <p className="text-xs text-muted">Total pagado en el período</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
          {formatMoney(totalAmount)}
        </p>
      </div>

      <ContentCard>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <SearchField
              aria-label="Buscar pagos de sueldo"
              value={search}
              onChange={onSearchChange}
              className="w-full lg:max-w-sm"
            >
              <Label>Buscar</Label>
              <SearchField.Input placeholder="Empleado, registrado por…" />
            </SearchField>

            <div className="inline-flex rounded-xl border border-separator p-1">
              {dashboardPeriodOptions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange(p)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    period === p ? "bg-accent text-accent-foreground" : "text-muted"
                  }`}
                >
                  {dashboardPeriodLabel[p]}
                </button>
              ))}
            </div>
          </div>

          {payments.length === 0 ? (
            <EmptyState
              icon={<Wallet width={28} height={28} />}
              title="Sin pagos de sueldo"
              description="No hay registros en este período o búsqueda."
            />
          ) : (
            <>
              <ul className="divide-y divide-separator rounded-2xl border border-separator">
                {payments.map((payment) => {
                  const { date, time } = formatDateTime(payment.paidAt);
                  return (
                    <li
                      key={payment.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{payment.employeeName}</p>
                        <p className="text-sm text-foreground">
                          {date} · {time}
                        </p>
                        <p className="text-xs text-muted">
                          {paymentMethodLabel[payment.method]} · Registrado por{" "}
                          {payment.registeredBy.name}
                          {showBranch && payment.branchName
                            ? ` · ${payment.branchName}`
                            : ""}
                        </p>
                        {payment.notes ? (
                          <p className="mt-1 text-xs text-muted">{payment.notes}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-lg font-bold tabular-nums text-emerald-600">
                        {formatMoney(payment.amount)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              {totalPages > 1 ? (
                <div className="flex justify-center pt-2">
                  <Pagination>
                    <Pagination.Summary>
                      {(page - 1) * PAGE_SIZE + 1} a{" "}
                      {Math.min(page * PAGE_SIZE, totalCount)} de {totalCount}
                    </Pagination.Summary>
                    <Pagination.Content>
                      <Pagination.Item>
                        <Pagination.Previous
                          isDisabled={page <= 1}
                          onPress={() => onPageChange(Math.max(1, page - 1))}
                        >
                          <Pagination.PreviousIcon />
                        </Pagination.Previous>
                      </Pagination.Item>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Pagination.Item key={p}>
                          <Pagination.Link
                            isActive={p === page}
                            onPress={() => onPageChange(p)}
                          >
                            {p}
                          </Pagination.Link>
                        </Pagination.Item>
                      ))}
                      <Pagination.Item>
                        <Pagination.Next
                          isDisabled={page >= totalPages}
                          onPress={() => onPageChange(Math.min(totalPages, page + 1))}
                        >
                          <Pagination.NextIcon />
                        </Pagination.Next>
                      </Pagination.Item>
                    </Pagination.Content>
                  </Pagination>
                </div>
              ) : null}
            </>
          )}
        </div>
      </ContentCard>
    </div>
  );
}

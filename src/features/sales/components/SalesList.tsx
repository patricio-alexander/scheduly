"use client";

import { useMemo, useState } from "react";
import {
  Pagination,
  SearchField,
  Label,
  Table,
} from "@heroui/react";
import Receipt from "@gravity-ui/icons/Receipt";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import { formatMoney } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import {
  dashboardPeriodLabel,
  dashboardPeriodOptions,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import type { SaleRecord } from "../types";

const PAGE_SIZE = 12;

interface Props {
  sales: SaleRecord[];
  loading?: boolean;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  method: PaymentMethodValue | "all";
  onMethodChange: (method: PaymentMethodValue | "all") => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function formatPaidAt(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function SalesList({
  sales,
  loading,
  period,
  onPeriodChange,
  method,
  onMethodChange,
  search,
  onSearchChange,
}: Props) {
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (sale) =>
        sale.customer.name.toLowerCase().includes(q) ||
        sale.staff.name.toLowerCase().includes(q) ||
        sale.title.toLowerCase().includes(q) ||
        sale.itemsSummary.toLowerCase().includes(q) ||
        sale.notes.toLowerCase().includes(q),
    );
  }, [sales, search]);

  const columns = useMemo(
    () => [{ accessorKey: "id" as const, header: "Venta" }],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    pageCount: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
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
    manualPagination: false,
  });

  const pageRows = table.getRowModel().rows;
  const totalPages = table.getPageCount();

  if (loading) {
    return (
      <ContentCard>
        <TableSkeleton />
      </ContentCard>
    );
  }

  return (
    <ContentCard>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div
          className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
          data-onboarding="sales-filters"
        >
          <SearchField value={search} onChange={onSearchChange}>
            <Label>Buscar venta</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                className="w-full sm:w-[320px]"
                placeholder="Cliente, servicio, staff..."
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex overflow-x-auto rounded-xl border border-separator p-1">
              {dashboardPeriodOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onPeriodChange(option);
                    setPage(1);
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
            <div className="inline-flex overflow-x-auto rounded-xl border border-separator p-1">
              <button
                type="button"
                onClick={() => {
                  onMethodChange("all");
                  setPage(1);
                }}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  method === "all"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Todos
              </button>
              {paymentMethodOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onMethodChange(option);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    method === option
                      ? "bg-accent text-accent-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {paymentMethodLabel[option]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sales.length === 0 ? (
          <EmptyState
            icon={<Receipt width={40} height={40} />}
            title="Sin ventas en este período"
            description="Cuando registres un pago al cerrar un turno, aparecerá aquí."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Receipt width={40} height={40} />}
            title="Sin resultados"
            description="Prueba con otro cliente, servicio o método de pago."
          />
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="flex flex-col gap-2 md:hidden">
              {pageRows.map((row) => {
                const sale = row.original;
                const { date, time } = formatPaidAt(sale.paidAt);
                return (
                  <li
                    key={sale.id}
                    className="rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {sale.customer.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                          {sale.itemsSummary || sale.title}
                        </p>
                        <p className="mt-1.5 text-[11px] text-muted">
                          {date} · {time} · {sale.staff.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums">
                          {formatMoney(sale.amount)}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-muted">
                          {paymentMethodLabel[sale.method]}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Ventas" className="min-w-[720px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Fecha</Table.Column>
                      <Table.Column>Cliente</Table.Column>
                      <Table.Column>Detalle</Table.Column>
                      <Table.Column>Atendido por</Table.Column>
                      <Table.Column>Método</Table.Column>
                      <Table.Column>Monto</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {pageRows.map((row) => {
                        const sale = row.original;
                        const { date, time } = formatPaidAt(sale.paidAt);
                        return (
                          <Table.Row key={sale.id}>
                            <Table.Cell>
                              <div>
                                <p className="text-sm font-medium">{date}</p>
                                <p className="text-xs text-muted">{time}</p>
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <p className="font-medium">{sale.customer.name}</p>
                            </Table.Cell>
                            <Table.Cell>
                              <p className="max-w-[240px] truncate text-sm">
                                {sale.itemsSummary || sale.title}
                              </p>
                            </Table.Cell>
                            <Table.Cell>
                              <p className="text-sm text-muted">{sale.staff.name}</p>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="inline-flex rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium">
                                {paymentMethodLabel[sale.method]}
                              </span>
                            </Table.Cell>
                            <Table.Cell>
                              <p className="text-right text-sm font-bold tabular-nums">
                                {formatMoney(sale.amount)}
                              </p>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>

            {totalPages > 1 && (
              <Pagination>
                <Pagination.Summary>
                  {filtered.length} venta{filtered.length === 1 ? "" : "s"}
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={page <= 1}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <Pagination.PreviousIcon />
                    </Pagination.Previous>
                  </Pagination.Item>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item key={p}>
                      <Pagination.Link
                        isActive={p === page}
                        onPress={() => setPage(p)}
                      >
                        {p}
                      </Pagination.Link>
                    </Pagination.Item>
                  ))}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={page >= totalPages}
                      onPress={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            )}
          </>
        )}
      </div>
    </ContentCard>
  );
}

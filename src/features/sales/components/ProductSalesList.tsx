"use client";

import { useMemo, useState } from "react";
import { Label, Pagination, SearchField, Table } from "@heroui/react";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import { formatMoney } from "@/shared/utils/money";
import {
  dashboardPeriodLabel,
  dashboardPeriodOptions,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { mergeProductSaleLines, summarizeProductSales } from "../lib/product-sales";
import type { ProductSaleLine } from "../types";

const PAGE_SIZE = 12;

interface Props {
  lines: ProductSaleLine[];
  loading?: boolean;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
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

export function ProductSalesList({
  lines: productLines,
  loading,
  period,
  onPeriodChange,
  search,
  onSearchChange,
}: Props) {
  const [page, setPage] = useState(1);

  const summary = useMemo(() => summarizeProductSales(productLines), [productLines]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productLines;
    return productLines.filter(
      (line) =>
        line.productName.toLowerCase().includes(q) ||
        line.customer.name.toLowerCase().includes(q) ||
        line.staff.name.toLowerCase().includes(q) ||
        (line.branch?.name ?? "").toLowerCase().includes(q) ||
        line.originLabel.toLowerCase().includes(q),
    );
  }, [productLines, search]);

  const table = useReactTable({
    data: filtered,
    columns: [{ accessorKey: "id" as const, header: "Producto" }],
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SearchField value={search} onChange={onSearchChange}>
            <Label>Buscar producto</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                className="w-full sm:w-[320px]"
                placeholder="Producto, cliente, estilista..."
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

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
        </div>

        {productLines.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3">
              <p className="text-xs text-muted">Unidades vendidas</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{summary.totalUnits}</p>
            </div>
            <div className="rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3">
              <p className="text-xs text-muted">Ingreso por productos</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-accent">
                {formatMoney(summary.totalAmount)}
              </p>
            </div>
            <div className="rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3">
              <p className="text-xs text-muted">Producto más vendido</p>
              <p className="mt-1 truncate text-sm font-semibold">
                {summary.topProduct?.name ?? "—"}
              </p>
              {summary.topProduct ? (
                <p className="text-xs text-muted tabular-nums">
                  {summary.topProduct.units} uds · {formatMoney(summary.topProduct.amount)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {productLines.length === 0 ? (
          <EmptyState
            icon={<Boxes3 width={40} height={40} />}
            title="Sin productos vendidos"
            description="Registra ventas en mostrador o cierra turnos con productos retail."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Boxes3 width={40} height={40} />}
            title="Sin resultados"
            description="Prueba con otro producto, cliente o estilista."
          />
        ) : (
          <>
            <ul className="flex flex-col gap-2 md:hidden">
              {pageRows.map((row) => {
                const line = row.original as ProductSaleLine;
                const { date, time } = formatPaidAt(line.paidAt);
                return (
                  <li
                    key={line.id}
                    className="rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{line.productName}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {line.quantity} uds · {line.customer.name}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          {date} · {time} · {line.staff.name}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums">
                        {formatMoney(line.lineTotal)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden md:block">
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Productos vendidos" className="min-w-[760px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Fecha</Table.Column>
                      <Table.Column>Producto</Table.Column>
                      <Table.Column>Cant.</Table.Column>
                      <Table.Column>Cliente</Table.Column>
                      <Table.Column>Estilista</Table.Column>
                      <Table.Column>Sucursal</Table.Column>
                      <Table.Column>Origen</Table.Column>
                      <Table.Column>Total</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {pageRows.map((row) => {
                        const line = row.original as ProductSaleLine;
                        const { date, time } = formatPaidAt(line.paidAt);
                        return (
                          <Table.Row key={line.id}>
                            <Table.Cell>
                              <div>
                                <p className="text-sm font-medium">{date}</p>
                                <p className="text-xs text-muted">{time}</p>
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <p className="font-medium">{line.productName}</p>
                              <p className="text-xs text-muted tabular-nums">
                                {formatMoney(line.unitPrice)} c/u
                              </p>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="tabular-nums">{line.quantity}</span>
                            </Table.Cell>
                            <Table.Cell>{line.customer.name}</Table.Cell>
                            <Table.Cell className="text-muted">{line.staff.name}</Table.Cell>
                            <Table.Cell className="text-muted">
                              {line.branch?.name ?? "—"}
                            </Table.Cell>
                            <Table.Cell className="text-muted">
                              {line.originLabel}
                            </Table.Cell>
                            <Table.Cell>
                              <p className="text-right font-bold tabular-nums">
                                {formatMoney(line.lineTotal)}
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

            {totalPages > 1 ? (
              <Pagination>
                <Pagination.Summary>
                  {filtered.length} línea{filtered.length === 1 ? "" : "s"}
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
                      <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                        {p}
                      </Pagination.Link>
                    </Pagination.Item>
                  ))}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={page >= totalPages}
                      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            ) : null}
          </>
        )}
      </div>
    </ContentCard>
  );
}

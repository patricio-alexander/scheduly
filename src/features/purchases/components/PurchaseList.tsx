"use client";

import { useMemo, useState } from "react";
import {
  Pagination,
  SearchField,
  Label,
  Table,
} from "@heroui/react";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
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
import { useOperationFlags } from "@/src/features/settings/hooks/useOperationFlags";
import type { PurchaseRecord } from "../types";

const PAGE_SIZE = 12;

interface Props {
  purchases: PurchaseRecord[];
  loading?: boolean;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function formatPurchasedAt(iso: string) {
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

export function PurchaseList({
  purchases,
  loading,
  period,
  onPeriodChange,
  search,
  onSearchChange,
}: Props) {
  const [page, setPage] = useState(1);
  const flags = useOperationFlags();
  const showBranch = flags.showBranchColumn;
  const showSupplier = flags.purchasesShowSupplierColumn;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter(
      (purchase) =>
        (purchase.supplier?.name.toLowerCase().includes(q) ?? false) ||
        purchase.staff.name.toLowerCase().includes(q) ||
        purchase.itemsSummary.toLowerCase().includes(q) ||
        purchase.notes.toLowerCase().includes(q),
    );
  }, [purchases, search]);

  const columns = useMemo(
    () => [{ accessorKey: "id" as const, header: "Compra" }],
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SearchField value={search} onChange={onSearchChange}>
            <Label>Buscar compra</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                className="w-full sm:w-[320px]"
                placeholder="Proveedor, producto, staff..."
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

        {purchases.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart width={40} height={40} />}
            title="Sin compras en este período"
            description="Registra una compra para reponer inventario."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart width={40} height={40} />}
            title="Sin resultados"
            description="Prueba con otro proveedor o producto."
          />
        ) : (
          <>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Historial de compras" className="min-w-[880px]">
                  <Table.Header>
                    <Table.Column isRowHeader>Fecha</Table.Column>
                    {showBranch ? <Table.Column>Sucursal</Table.Column> : null}
                    {showSupplier ? <Table.Column>Proveedor</Table.Column> : null}
                    <Table.Column>Productos</Table.Column>
                    <Table.Column>Método</Table.Column>
                    <Table.Column>Registró</Table.Column>
                    <Table.Column>Total</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {pageRows.map((row) => {
                      const purchase = row.original;
                      const { date, time } = formatPurchasedAt(purchase.purchasedAt);
                      return (
                        <Table.Row key={purchase.id}>
                          <Table.Cell>
                            <div>
                              <p className="text-sm font-medium tabular-nums">{date}</p>
                              <p className="text-xs text-muted tabular-nums">{time}</p>
                            </div>
                          </Table.Cell>
                          {showBranch ? (
                            <Table.Cell>
                              <span className="text-sm text-muted">
                                {purchase.branch?.name ?? "—"}
                              </span>
                            </Table.Cell>
                          ) : null}
                          {showSupplier ? (
                            <Table.Cell>
                              <span className="text-sm font-semibold uppercase tracking-wide">
                                {purchase.supplier?.name ?? "—"}
                              </span>
                            </Table.Cell>
                          ) : null}
                          <Table.Cell>
                            <span className="line-clamp-2 max-w-xs text-muted">
                              {purchase.itemsSummary || "—"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            {paymentMethodLabel[purchase.method]}
                          </Table.Cell>
                          <Table.Cell>{purchase.staff.name}</Table.Cell>
                          <Table.Cell>
                            <span className="font-semibold tabular-nums">
                              {formatMoney(purchase.amount)}
                            </span>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            {filtered.length > PAGE_SIZE ? (
              <Table.Footer>
                <Pagination size="sm">
                  <Pagination.Summary>
                    {table.getState().pagination.pageIndex * PAGE_SIZE + 1} a{" "}
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) * PAGE_SIZE,
                      filtered.length,
                    )}{" "}
                    de {filtered.length} resultados
                  </Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous
                        isDisabled={!table.getCanPreviousPage()}
                        onPress={() => table.previousPage()}
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
                        isDisabled={!table.getCanNextPage()}
                        onPress={() => table.nextPage()}
                      >
                        <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </Table.Footer>
            ) : null}
          </>
        )}
      </div>
    </ContentCard>
  );
}

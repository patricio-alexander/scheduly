"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Modal,
  Pagination,
  SearchField,
  Label,
  Table,
  useOverlayState,
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
import { SaleDetailBody } from "./SaleDetailModal";

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

function SaleRowButton({
  sale,
  onPress,
  layout,
}: {
  sale: SaleRecord;
  onPress: () => void;
  layout: "mobile" | "desktop";
}) {
  const { date, time } = formatPaidAt(sale.paidAt);

  if (layout === "mobile") {
    return (
      <button
        type="button"
        onClick={onPress}
        className="w-full rounded-2xl border border-separator bg-surface-secondary/40 px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-surface-secondary/80"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{sale.customer.name}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">
              {sale.itemsSummary || sale.title}
            </p>
            <p className="mt-1.5 text-[11px] text-muted">
              {date} · {time} · {sale.staff.name}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold tabular-nums">{formatMoney(sale.amount)}</p>
            <p className="mt-1 text-[11px] font-medium text-muted">
              {paymentMethodLabel[sale.method]}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onPress}
      className="grid w-full grid-cols-[minmax(5rem,0.9fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(4.5rem,auto)] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-secondary/60"
    >
      <div>
        <p className="text-sm font-medium">{date}</p>
        <p className="text-xs text-muted">{time}</p>
      </div>
      <p className="truncate font-medium">{sale.customer.name}</p>
      <p className="truncate text-sm">{sale.itemsSummary || sale.title}</p>
      <p className="truncate text-sm text-muted">{sale.staff.name}</p>
      <span className="inline-flex w-fit rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium">
        {paymentMethodLabel[sale.method]}
      </span>
      <p className="text-right text-sm font-bold tabular-nums">{formatMoney(sale.amount)}</p>
    </button>
  );
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
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const detailModal = useOverlayState();

  const openSaleDetail = (sale: SaleRecord) => {
    setSelectedSale(sale);
    detailModal.open();
  };

  const closeSaleDetail = () => {
    detailModal.close();
    setSelectedSale(null);
  };

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
    <>
      <ContentCard>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div
            className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
            data-onboarding="sales-filters"
          >
            <SearchField value={search} onChange={onSearchChange}>
              <Label>Buscar cobro</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  className="w-full sm:w-[320px]"
                  placeholder="Cliente, servicio, producto, staff..."
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
              title="Sin ingresos en este período"
              description="Cuando registres un cobro al cerrar un turno (servicios o productos), aparecerá aquí."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt width={40} height={40} />}
              title="Sin resultados"
              description="Prueba con otro cliente, servicio, producto o método de pago."
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2 md:hidden">
                {pageRows.map((row) => (
                  <li key={row.original.id}>
                    <SaleRowButton
                      sale={row.original}
                      layout="mobile"
                      onPress={() => openSaleDetail(row.original)}
                    />
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Ingresos por turnos" className="min-w-[720px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Fecha</Table.Column>
                        <Table.Column>Cliente</Table.Column>
                        <Table.Column>Detalle</Table.Column>
                        <Table.Column>Atendido por</Table.Column>
                        <Table.Column>Método</Table.Column>
                        <Table.Column>Monto</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {pageRows.map((row) => (
                          <Table.Row key={row.original.id}>
                            <Table.Cell colSpan={6} className="p-0">
                              <SaleRowButton
                                sale={row.original}
                                layout="desktop"
                                onPress={() => openSaleDetail(row.original)}
                              />
                            </Table.Cell>
                          </Table.Row>
                        ))}
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
                        onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      <Modal state={detailModal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center" size="lg" scroll="inside">
            <Modal.Dialog className="!max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon>
                  <Receipt width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {selectedSale?.title ?? "Detalle del turno"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {selectedSale ? <SaleDetailBody sale={selectedSale} /> : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={closeSaleDetail}>
                  Cerrar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

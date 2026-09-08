"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Label,
  Modal,
  SearchField,
  useOverlayState,
} from "@heroui/react";
import Receipt from "@gravity-ui/icons/Receipt";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
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
import { useOperationFlags } from "@/src/features/settings/hooks/useOperationFlags";
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
      second: "2-digit",
    }),
  };
}

function SaleRowButton({
  sale,
  onPress,
  layout,
  showCustomer,
  showBranch,
}: {
  sale: SaleRecord;
  onPress: () => void;
  layout: "mobile" | "desktop";
  showCustomer: boolean;
  showBranch: boolean;
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
            {showCustomer ? (
              <p className="truncate text-sm font-semibold uppercase tracking-wide">
                {sale.customer.name || "—"}
              </p>
            ) : null}
            <p
              className={`line-clamp-2 text-xs text-muted ${showCustomer ? "mt-0.5" : ""}`}
            >
              {sale.itemsSummary || sale.title}
            </p>
            <p className="mt-1.5 text-[11px] text-muted">
              {date} · {time}
              {showBranch && sale.branch?.name ? ` · ${sale.branch.name}` : ""}
              {" · "}
              {sale.staff.name}
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

  const gridTemplateColumns = [
    "minmax(5rem,0.9fr)",
    showBranch ? "minmax(0,0.9fr)" : null,
    showCustomer ? "minmax(0,1.1fr)" : null,
    "minmax(0,1.4fr)",
    "minmax(0,1fr)",
    "minmax(0,0.9fr)",
    "minmax(4.5rem,auto)",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={onPress}
      className="grid w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-secondary/60"
      style={{ gridTemplateColumns }}
    >
      <div>
        <p className="text-sm font-medium">{date}</p>
        <p className="text-xs text-muted">{time}</p>
      </div>
      {showBranch ? (
        <p className="truncate text-sm text-muted">{sale.branch?.name ?? "—"}</p>
      ) : null}
      {showCustomer ? (
        <p className="truncate text-sm font-semibold uppercase tracking-wide">
          {sale.customer.name || "—"}
        </p>
      ) : null}
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
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const detailModal = useOverlayState();
  const flags = useOperationFlags();
  const showCustomer = flags.salesShowCustomerColumn;
  const showBranch = flags.showBranchColumn;
  const colSpan =
    5 + (showCustomer ? 1 : 0) + (showBranch ? 1 : 0);

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

  const columns = useMemo<TableProColumn<SaleRecord>[]>(() => {
    const cols: TableProColumn<SaleRecord>[] = [
      {
        id: "paidAt",
        label: "Fecha",
        getSortValue: (s) => new Date(s.paidAt).getTime(),
        getSearchValue: (s) => s.paidAt,
        render: (s) => {
          const { date, time } = formatPaidAt(s.paidAt);
          return (
            <div>
              <p className="text-sm font-medium tabular-nums">{date}</p>
              <p className="text-xs text-muted tabular-nums">{time}</p>
            </div>
          );
        },
      },
    ];
    if (showBranch) {
      cols.push({
        id: "branch",
        label: "Sucursal",
        getSortValue: (s) => (s.branch?.name ?? "").toLowerCase(),
        getSearchValue: (s) => s.branch?.name ?? "",
        render: (s) => (
          <span className="text-sm text-muted">{s.branch?.name ?? "—"}</span>
        ),
      });
    }
    if (showCustomer) {
      cols.push({
        id: "customer",
        label: "Cliente",
        getSortValue: (s) => s.customer.name.toLowerCase(),
        getSearchValue: (s) => s.customer.name,
        render: (s) => (
          <span className="text-sm font-semibold uppercase tracking-wide">
            {s.customer.name || "—"}
          </span>
        ),
      });
    }
    cols.push(
      {
        id: "detail",
        label: "Detalle",
        getSortValue: (s) => (s.itemsSummary || s.title).toLowerCase(),
        getSearchValue: (s) => `${s.itemsSummary} ${s.title} ${s.notes}`,
        render: (s) => (
          <span className="line-clamp-2 text-sm text-muted">
            {s.itemsSummary || s.title}
          </span>
        ),
      },
      {
        id: "staff",
        label: "Atendido por",
        getSortValue: (s) => s.staff.name.toLowerCase(),
        getSearchValue: (s) => s.staff.name,
        render: (s) => s.staff.name,
      },
      {
        id: "method",
        label: "Método",
        getSortValue: (s) => paymentMethodLabel[s.method] ?? s.method,
        render: (s) => paymentMethodLabel[s.method],
      },
      {
        id: "amount",
        label: "Monto",
        align: "right",
        getSortValue: (s) => s.amount,
        render: (s) => (
          <span className="font-semibold tabular-nums">
            {formatMoney(s.amount)}
          </span>
        ),
      },
    );
    return cols;
  }, [showBranch, showCustomer]);

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
            <TablePro
              columns={columns}
              rows={filtered}
              getRowId={(s) => s.id}
              showSearch={false}
              emptyMessage="Sin resultados"
              defaultRowsPerPage={12}
              rowsPerPageOptions={[12, 25, 50]}
              dense
              onRowClick={(sale) => openSaleDetail(sale)}
            />
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

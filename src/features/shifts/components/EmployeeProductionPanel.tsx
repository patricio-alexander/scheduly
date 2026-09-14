"use client";

import { Fragment, useState } from "react";
import ChevronDown from "@gravity-ui/icons/ChevronDown";
import { formatMoney } from "@/shared/utils/money";

export type EmployeeTicket = {
  id: number;
  source: "turno" | "tienda" | "vale";
  paidAt: string;
  customerName: string;
  services: number;
  products: number;
  vouchers: number;
  total: number;
  method: string | null;
  itemsSummary: string;
};

export type EmployeeProduction = {
  personId: number;
  name: string;
  appointmentsCount: number;
  ticketsCount: number;
  servicesTotal: number;
  productsTotal: number;
  vouchersTotal: number;
  total: number;
  tickets?: EmployeeTicket[];
};

export type EmployeeProductionTotals = {
  employeesCount: number;
  appointmentsCount: number;
  ticketsCount: number;
  servicesTotal: number;
  productsTotal: number;
  vouchersTotal: number;
  total: number;
};

function ticketSourceLabel(source: EmployeeTicket["source"]) {
  if (source === "turno") return "turno";
  if (source === "vale") return "vale";
  return "venta";
}

function ticketTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

type EmployeeProductionPanelProps = {
  employees: EmployeeProduction[];
  summary: EmployeeProductionTotals | null;
  showTickets?: boolean;
};

export function EmployeeProductionPanel({
  employees,
  summary,
  showTickets = false,
}: EmployeeProductionPanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (employees.length === 0) {
    return (
      <p className="py-5 text-center text-xs text-muted">
        Nadie tiene servicios, productos ni vales en este periodo
      </p>
    );
  }

  const maxTotal = employees.reduce((max, row) => Math.max(max, row.total), 0);

  return (
    <div className="cash-scroll">
      <table className="cash-table min-w-[560px]">
        <thead>
          <tr>
            <th className="hidden w-7 pr-2 sm:table-cell">#</th>
            <th>Empleado</th>
            <th
              className="text-right text-accent"
              title="Comisión por servicios"
            >
              Servicios
            </th>
            <th
              className="text-right text-sky-500"
              title="Comisión por productos"
            >
              Productos
            </th>
            <th
              className="text-right text-amber-600"
              title="Vales / adelantos"
            >
              Vales
            </th>
            <th className="text-right">Comisiones</th>
            <th className="pl-2 text-right" title="Tickets cobrados">
              Tickets
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((row, index) => {
            const open = showTickets && expandedId === row.personId;
            const tickets = row.tickets ?? [];
            const clickable = showTickets && tickets.length > 0;
            const share = maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
            const toggle = () => {
              if (!clickable) return;
              setExpandedId(open ? null : row.personId);
            };
            return (
              <Fragment key={row.personId}>
                <tr
                  className={`cash-row ${clickable ? "cash-row--clickable" : ""} ${
                    open ? "cash-row--open" : ""
                  }`}
                  onClick={toggle}
                >
                  <td className="hidden pr-2 tabular-nums text-muted sm:table-cell">
                    {index + 1}
                  </td>
                  <td className="max-w-[11rem]">
                    <div className="flex min-w-0 items-center gap-1">
                      {clickable ? (
                        <button
                          type="button"
                          className={`cash-chevron ${open ? "cash-chevron--open" : ""}`}
                          aria-expanded={open}
                          aria-label={`${open ? "Ocultar" : "Ver"} tickets de ${row.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggle();
                          }}
                        >
                          <ChevronDown width={12} height={12} />
                        </button>
                      ) : (
                        <span className="w-4 shrink-0" aria-hidden />
                      )}
                      <span className="truncate font-medium">{row.name}</span>
                    </div>
                    {share > 0 ? (
                      <span className="cash-share" aria-hidden>
                        <span
                          className="cash-share__fill"
                          style={{ width: `${share}%` }}
                        />
                      </span>
                    ) : null}
                  </td>
                  <td className="text-right tabular-nums text-accent">
                    {formatMoney(row.servicesTotal)}
                  </td>
                  <td className="text-right tabular-nums text-sky-500">
                    {formatMoney(row.productsTotal)}
                  </td>
                  <td className="text-right tabular-nums text-amber-600">
                    {formatMoney(row.vouchersTotal ?? 0)}
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {formatMoney(row.total)}
                  </td>
                  <td className="pl-2 text-right tabular-nums text-muted">
                    {row.ticketsCount}
                  </td>
                </tr>
                {open
                  ? tickets.map((ticket, ticketIndex) => (
                      <tr
                        key={`${ticket.source}-${ticket.id}`}
                        className="cash-subrow"
                      >
                        <td className="hidden pr-2 text-muted sm:table-cell">
                          {ticketIndex + 1}
                        </td>
                        <td className="pl-5">
                          <span className="font-medium">
                            {ticket.customerName}
                          </span>
                          <span className="ml-1.5 text-muted">
                            {ticketTime(ticket.paidAt)} ·{" "}
                            {ticketSourceLabel(ticket.source)}
                          </span>
                          {ticket.itemsSummary ? (
                            <span className="mt-0.5 block truncate text-[10px] text-muted">
                              {ticket.itemsSummary}
                            </span>
                          ) : null}
                        </td>
                        <td className="text-right tabular-nums text-accent">
                          {formatMoney(ticket.services)}
                        </td>
                        <td className="text-right tabular-nums text-sky-500">
                          {formatMoney(ticket.products)}
                        </td>
                        <td className="text-right tabular-nums text-amber-600">
                          {formatMoney(ticket.vouchers ?? 0)}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatMoney(ticket.total)}
                        </td>
                        <td />
                      </tr>
                    ))
                  : null}
              </Fragment>
            );
          })}
        </tbody>
        {summary ? (
          <tfoot>
            <tr>
              <td className="hidden sm:table-cell" />
              <td>
                Total comisiones
                <span className="ml-1 font-normal text-muted">
                  {summary.employeesCount}{" "}
                  {summary.employeesCount === 1 ? "persona" : "personas"}
                </span>
              </td>
              <td className="text-right tabular-nums text-accent">
                {formatMoney(summary.servicesTotal)}
              </td>
              <td className="text-right tabular-nums text-sky-500">
                {formatMoney(summary.productsTotal)}
              </td>
              <td className="text-right tabular-nums text-amber-600">
                {formatMoney(summary.vouchersTotal ?? 0)}
              </td>
              <td className="text-right tabular-nums">
                {formatMoney(summary.total)}
              </td>
              <td className="pl-2 text-right tabular-nums text-muted">
                {summary.ticketsCount}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

"use client";

import { Fragment, useState } from "react";
import { formatMoney } from "@/shared/utils/money";

export type EmployeeTicket = {
  id: number;
  source: "turno" | "tienda";
  paidAt: string;
  customerName: string;
  services: number;
  products: number;
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
  total: number;
  tickets?: EmployeeTicket[];
};

export type EmployeeProductionTotals = {
  employeesCount: number;
  appointmentsCount: number;
  ticketsCount: number;
  servicesTotal: number;
  productsTotal: number;
  total: number;
};

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
      <p className="py-4 text-center text-xs text-muted">
        Sin comisiones en este periodo
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="border-b border-separator text-[10px] uppercase tracking-wide text-muted">
          <tr>
            <th className="w-8 py-1.5 pr-2 font-medium">#</th>
            <th className="py-1.5 font-medium">Empleado</th>
            <th className="py-1.5 text-right font-medium text-accent">Se</th>
            <th className="py-1.5 text-right font-medium text-sky-500">Pr</th>
            <th className="py-1.5 text-right font-medium">Comisiones</th>
            <th className="py-1.5 pl-2 text-right font-medium">Tk</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((row, index) => {
            const open = showTickets && expandedId === row.personId;
            const tickets = row.tickets ?? [];
            const clickable = showTickets && tickets.length > 0;
            return (
              <Fragment key={row.personId}>
                <tr
                  className={`border-b border-separator/60 ${
                    clickable ? "cursor-pointer hover:bg-surface-secondary/50" : ""
                  } ${open ? "bg-accent/5" : ""}`}
                  onClick={() => {
                    if (!clickable) return;
                    setExpandedId(open ? null : row.personId);
                  }}
                >
                  <td className="py-1.5 pr-2 tabular-nums text-muted">
                    {index + 1}
                  </td>
                  <td className="max-w-[10rem] truncate py-1.5 font-medium">
                    {row.name}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-accent">
                    {formatMoney(row.servicesTotal)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-sky-500">
                    {formatMoney(row.productsTotal)}
                  </td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">
                    {formatMoney(row.total)}
                  </td>
                  <td className="py-1.5 pl-2 text-right tabular-nums text-muted">
                    {row.ticketsCount}
                  </td>
                </tr>
                {open
                  ? tickets.map((ticket, ticketIndex) => (
                      <tr
                        key={`${ticket.source}-${ticket.id}`}
                        className="border-b border-separator/40 bg-surface-secondary/30 text-[11px]"
                      >
                        <td className="py-1 pr-2 text-muted">{ticketIndex + 1}</td>
                        <td className="py-1">
                          <span className="font-medium">{ticket.customerName}</span>
                          <span className="ml-1.5 text-muted">
                            {ticketTime(ticket.paidAt)} ·{" "}
                            {ticket.source === "turno" ? "turno" : "tienda"}
                          </span>
                          {ticket.itemsSummary ? (
                            <span className="mt-0.5 block truncate text-[10px] text-muted">
                              {ticket.itemsSummary}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-1 text-right tabular-nums text-accent">
                          {formatMoney(ticket.services)}
                        </td>
                        <td className="py-1 text-right tabular-nums text-sky-500">
                          {formatMoney(ticket.products)}
                        </td>
                        <td className="py-1 text-right tabular-nums">
                          {formatMoney(ticket.total)}
                        </td>
                        <td />
                      </tr>
                    ))
                  : null}
              </Fragment>
            );
          })}
          {summary ? (
            <tr className="border-t border-separator font-semibold">
              <td className="py-1.5" colSpan={2}>
                Comisiones
              </td>
              <td className="py-1.5 text-right tabular-nums text-accent">
                {formatMoney(summary.servicesTotal)}
              </td>
              <td className="py-1.5 text-right tabular-nums text-sky-500">
                {formatMoney(summary.productsTotal)}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {formatMoney(summary.total)}
              </td>
              <td className="py-1.5 pl-2 text-right tabular-nums text-muted">
                {summary.ticketsCount}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

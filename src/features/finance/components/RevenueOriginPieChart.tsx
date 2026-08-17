"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/shared/utils/money";

const PIE_COLORS = {
  appointments: "var(--accent)",
  direct: "oklch(62% 0.17 155)",
};

type Breakdown = {
  appointmentPayments: { amount: number; count?: number; sharePct: number };
  directProductSales: { amount: number; count?: number; sharePct: number };
  servicesOnAppointments: { amount: number; sharePct: number };
  productsOnAppointments: { amount: number; sharePct: number };
};

interface Props {
  breakdown: Breakdown;
  totalRevenue: number;
}

export function RevenueOriginPieChart({ breakdown, totalRevenue }: Props) {
  const pieData = useMemo(
    () => [
      {
        key: "appointments",
        label: "Pagos de turnos",
        amount: breakdown.appointmentPayments.amount,
        sharePct: breakdown.appointmentPayments.sharePct,
        color: PIE_COLORS.appointments,
      },
      {
        key: "direct",
        label: "Ventas directas",
        amount: breakdown.directProductSales.amount,
        sharePct: breakdown.directProductSales.sharePct,
        color: PIE_COLORS.direct,
      },
    ],
    [breakdown],
  );

  const legendSections = useMemo(
    () => [
      {
        key: "appointments-group",
        label: "Pagos de turnos",
        amount: breakdown.appointmentPayments.amount,
        sharePct: breakdown.appointmentPayments.sharePct,
        detail: `${breakdown.appointmentPayments.count ?? 0} turno${(breakdown.appointmentPayments.count ?? 0) === 1 ? "" : "s"} cobrado${(breakdown.appointmentPayments.count ?? 0) === 1 ? "" : "s"} en agenda`,
        color: PIE_COLORS.appointments,
        isGroup: true,
      },
      {
        key: "services",
        label: "Servicios en turnos",
        amount: breakdown.servicesOnAppointments.amount,
        sharePct: breakdown.servicesOnAppointments.sharePct,
        detail: "Parte del cobro de turnos",
        nested: true,
      },
      {
        key: "products-apt",
        label: "Productos en turnos",
        amount: breakdown.productsOnAppointments.amount,
        sharePct: breakdown.productsOnAppointments.sharePct,
        detail: "Productos vendidos dentro del turno",
        nested: true,
      },
      {
        key: "direct",
        label: "Ventas directas de productos",
        amount: breakdown.directProductSales.amount,
        sharePct: breakdown.directProductSales.sharePct,
        detail: `${breakdown.directProductSales.count ?? 0} venta${(breakdown.directProductSales.count ?? 0) === 1 ? "" : "s"} sin turno`,
        color: PIE_COLORS.direct,
        isGroup: true,
      },
    ],
    [breakdown],
  );

  const pieSlices = pieData.filter((item) => item.amount > 0);

  if (totalRevenue <= 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">Sin ingresos en este período.</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
      <div className="relative mx-auto h-52 w-52 shrink-0 sm:h-60 sm:w-60">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieSlices.length > 0 ? pieSlices : pieData}
              dataKey="amount"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={pieSlices.length > 1 ? 2 : 0}
              stroke="none"
            >
              {(pieSlices.length > 0 ? pieSlices : pieData).map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const payload = item.payload as (typeof pieData)[number];
                return [
                  `${formatMoney(Number(value))} (${payload.sharePct}%)`,
                  payload.label,
                ];
              }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--separator)",
                borderRadius: "12px",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Total</p>
          <p className="text-base font-bold tabular-nums text-emerald-600 sm:text-lg">
            {formatMoney(totalRevenue)}
          </p>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {legendSections.map((item) => (
          <li
            key={item.key}
            className={`flex items-start justify-between gap-3 rounded-xl border border-separator/80 px-3 py-2.5 ${
              item.nested
                ? "ml-4 border-dashed bg-surface-secondary/20"
                : "bg-surface-secondary/30"
            }`}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              {item.color ? (
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
              ) : (
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-separator bg-transparent" />
              )}
              <div className="min-w-0">
                <p className={`font-medium ${item.nested ? "text-sm" : ""}`}>{item.label}</p>
                {item.detail ? <p className="text-xs text-muted">{item.detail}</p> : null}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={`tabular-nums ${item.isGroup ? "font-semibold" : "font-medium text-sm"}`}>
                {formatMoney(item.amount)}
              </p>
              <p className="text-xs tabular-nums text-muted">{item.sharePct}%</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

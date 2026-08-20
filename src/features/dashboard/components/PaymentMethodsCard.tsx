"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import Receipt from "@gravity-ui/icons/Receipt";
import type { DashboardPaymentBreakdownItem } from "@/shared/utils/dashboard-widgets";
import { useChartThemeColors } from "../hooks/useChartThemeColors";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

type PaymentMethodsCardProps = {
  breakdown: DashboardPaymentBreakdownItem[];
  periodDescription?: string;
};

export function PaymentMethodsCard({
  breakdown,
  periodDescription,
}: PaymentMethodsCardProps) {
  const theme = useChartThemeColors();
  const paymentColors = [
    theme.accent,
    theme.success,
    theme.warning,
    "#6366f1",
  ];

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col rounded-2xl border border-separator bg-surface p-4 md:p-5"
      data-onboarding="dash-payment-methods"
    >
      <div className="mb-3 flex items-center gap-2">
        <Receipt width={18} height={18} className="text-accent" />
        <div>
          <h2 className="text-base font-semibold">Métodos de pago</h2>
          <p className="text-xs text-muted">
            Distribución de cobros
            {periodDescription ? ` · ${periodDescription}` : ""}
          </p>
        </div>
      </div>
      {breakdown.length > 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="amount"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={52}
                  paddingAngle={3}
                  stroke="none"
                >
                  {breakdown.map((_, i) => (
                    <Cell
                      key={i}
                      fill={paymentColors[i % paymentColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: theme.surface,
                    border: `1px solid ${theme.separator}`,
                    borderRadius: "12px",
                    fontSize: 13,
                    color: theme.foreground,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full min-w-0 space-y-2">
            {breakdown.map((item, i) => (
              <li
                key={item.method}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background: paymentColors[i % paymentColors.length],
                    }}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="shrink-0 tabular-nums text-muted">
                  {item.sharePct}% · {formatCurrency(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-muted">
          Sin cobros registrados
        </p>
      )}
    </div>
  );
}

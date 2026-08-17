"use client";

import ChartColumn from "@gravity-ui/icons/ChartColumn";
import Receipt from "@gravity-ui/icons/Receipt";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import Persons from "@gravity-ui/icons/Persons";
import { StatCard } from "@/shared/components/StatCard";
import { Skeleton } from "@/shared/components/ui";
import { formatMoney } from "@/shared/utils/money";

interface Props {
  revenue: number;
  expenses: number;
  purchases: number;
  commissions: number;
  netIncome: number;
  periodLabel: string;
  loading?: boolean;
}

function shareOfRevenue(part: number, revenue: number) {
  if (revenue <= 0) return null;
  return Math.round((part / revenue) * 100);
}

export function FinanceKpiGrid({
  revenue,
  expenses,
  purchases,
  commissions,
  netIncome,
  periodLabel,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl md:h-28" />
        ))}
      </div>
    );
  }

  const expenseShare = shareOfRevenue(expenses, revenue);
  const purchaseShare = shareOfRevenue(purchases, revenue);
  const commissionShare = shareOfRevenue(commissions, revenue);
  const marginShare = shareOfRevenue(netIncome, revenue);

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-5">
      <StatCard
        label="Resultado neto"
        value={formatMoney(netIncome)}
        icon={<ChartColumn width={20} height={20} />}
        variant={netIncome >= 0 ? "success" : "warning"}
        subtitle={
          marginShare != null
            ? `${marginShare >= 0 ? "Margen" : "Pérdida"} del ${Math.abs(marginShare)}% sobre ingresos`
            : periodLabel
        }
      />
      <StatCard
        label="Ingresos totales"
        value={formatMoney(revenue)}
        icon={<ChartColumn width={20} height={20} />}
        variant="accent"
        subtitle="Turnos cobrados y ventas directas"
      />
      <StatCard
        label="Gastos"
        value={formatMoney(expenses)}
        icon={<Receipt width={20} height={20} />}
        variant="warning"
        subtitle={
          expenseShare != null
            ? `${expenseShare}% de los ingresos del período`
            : "Egresos registrados en el período"
        }
      />
      <StatCard
        label="Compras"
        value={formatMoney(purchases)}
        icon={<ShoppingCart width={20} height={20} />}
        variant="warning"
        subtitle={
          purchaseShare != null
            ? `${purchaseShare}% de los ingresos · reposición de inventario`
            : "Compras que incrementaron inventario"
        }
      />
      <StatCard
        label="Comisiones"
        value={formatMoney(commissions)}
        icon={<Persons width={20} height={20} />}
        variant="accent"
        subtitle={
          commissionShare != null
            ? `${commissionShare}% de los ingresos · compensación a empleados`
            : "Comisiones por turnos completados"
        }
      />
    </div>
  );
}

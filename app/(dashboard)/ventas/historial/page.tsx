"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import Receipt from "@gravity-ui/icons/Receipt";
import { PageHeader } from "@/shared/components/ui";
import { useAuth } from "@/src/features/auth";
import { SalesList, SalesSummary, useSales } from "@/src/features/sales";
import {
  getDashboardPeriodDescription,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import type { PaymentMethodValue } from "@/shared/utils/payment-methods";

export default function SalesHistoryPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [method, setMethod] = useState<PaymentMethodValue | "all">("all");
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useSales(period, method);

  if (!user) return null;

  const periodLabel = getDashboardPeriodDescription(period);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<Receipt width={24} height={24} />}
        title="Ingresos por turnos"
        description="Servicios y productos cobrados al cerrar turnos en la agenda"
      />

      {error ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">{error}</p>
          <Button size="sm" variant="secondary" onPress={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {!loading && data ? (
        <div data-onboarding="sales-summary">
          <SalesSummary
            totalCount={data.totalCount}
            totalAmount={data.totalAmount}
            byMethod={data.byMethod}
            periodLabel={periodLabel}
          />
        </div>
      ) : null}

      <div data-onboarding="sales-list">
        <SalesList
          sales={data?.sales ?? []}
          loading={loading}
          period={period}
          onPeriodChange={setPeriod}
          method={method}
          onMethodChange={setMethod}
          search={search}
          onSearchChange={setSearch}
        />
      </div>
    </div>
  );
}

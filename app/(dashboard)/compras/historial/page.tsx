"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import { PageHeader } from "@/shared/components/ui";
import { useAuth } from "@/src/features/auth";
import {
  PurchaseList,
  PurchaseSummary,
  usePurchases,
} from "@/src/features/purchases";
import {
  getDashboardPeriodDescription,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { isOwnerRole } from "@/shared/utils/roles";

export default function PurchaseHistoryPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = usePurchases(period);

  if (!user) return null;

  const periodLabel = getDashboardPeriodDescription(period);
  const branchScoped = !isOwnerRole(user.role) && user.branch;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<ShoppingCart width={24} height={24} />}
        title="Historial de compras"
        description={
          branchScoped
            ? `Compras registradas en ${user.branch!.name} · ${periodLabel.toLowerCase()}`
            : `Compras registradas que incrementaron el inventario · ${periodLabel.toLowerCase()}`
        }
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
        <PurchaseSummary
          totalCount={data.totalCount}
          totalAmount={data.totalAmount}
          byMethod={data.byMethod}
          periodLabel={periodLabel}
        />
      ) : null}

      <PurchaseList
        purchases={data?.purchases ?? []}
        loading={loading}
        period={period}
        onPeriodChange={setPeriod}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}

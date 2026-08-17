"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import Plus from "@gravity-ui/icons/Plus";
import { PageHeader } from "@/shared/components/ui";
import { appRoutes } from "@/shared/utils/app-routes";
import { useAuth } from "@/src/features/auth";
import {
  ProductSalesList,
  useDirectProductSales,
  useSales,
  mergeProductSaleLines,
} from "@/src/features/sales";
import {
  getDashboardPeriodDescription,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { isManagementRole } from "@/shared/utils/roles";

export default function ProductSalesPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [search, setSearch] = useState("");
  const { data: appointmentData, loading: loadingAppointments, error: appointmentError, refetch: refetchAppointments } = useSales(period, "all");
  const { data: directData, loading: loadingDirect, error: directError, refetch: refetchDirect } = useDirectProductSales(period);

  if (!user) return null;

  const periodLabel = getDashboardPeriodDescription(period);
  const canRegisterSale = isManagementRole(user.role);
  const loading = loadingAppointments || loadingDirect;
  const error = appointmentError ?? directError;

  const lines = useMemo(
    () =>
      mergeProductSaleLines(
        appointmentData?.sales ?? [],
        directData?.sales ?? [],
      ),
    [appointmentData?.sales, directData?.sales],
  );

  const refetch = () => {
    void refetchAppointments();
    void refetchDirect();
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<Boxes3 width={24} height={24} />}
        title="Productos vendidos"
        description={`Retail en turnos y ventas de mostrador · ${periodLabel.toLowerCase()}`}
        action={
          canRegisterSale ? (
            <Link
              href={appRoutes.sales.register}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              <Plus width={16} height={16} />
              Registrar venta
            </Link>
          ) : undefined
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

      <ProductSalesList
        lines={lines}
        loading={loading}
        period={period}
        onPeriodChange={setPeriod}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}

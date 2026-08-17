"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { Button } from "@heroui/react";
import { Link } from "@heroui/react/link";
import Persons from "@gravity-ui/icons/Persons";
import { PageHeader } from "@/shared/components/ui";
import { BranchSelector, useBranches } from "@/src/features/branches";
import { useAuth } from "@/src/features/auth";
import { PayrollList, usePayroll } from "@/src/features/payroll";
import { appRoutes } from "@/shared/utils/app-routes";
import { apiUrl } from "@/shared/utils/api";
import {
  getDashboardPeriodDescription,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { isOwnerRole } from "@/shared/utils/roles";

export default function PayrollPage() {
  const { user } = useAuth();
  const { branches } = useBranches();
  const owner = user ? isOwnerRole(user.role) : false;
  const lockedBranch = user?.branch ?? null;
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [branchId, setBranchId] = useState<number | "all">("all");

  const effectiveBranchId =
    owner || !lockedBranch
      ? branchId === "all"
        ? null
        : branchId
      : lockedBranch.id;

  useEffect(() => {
    if (!owner && lockedBranch) {
      setBranchId(lockedBranch.id);
    }
  }, [owner, lockedBranch]);

  const { data, loading, error, refetch } = usePayroll(period, effectiveBranchId);

  if (!user) return null;

  const branchScoped = !owner && lockedBranch;
  const periodLabel = getDashboardPeriodDescription(period);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<Persons width={24} height={24} />}
        title="Sueldos"
        description={
          branchScoped
            ? `Comisiones y pagos a empleados de ${lockedBranch.name} · ${periodLabel.toLowerCase()}`
            : `Comisiones y pagos a empleados · ${periodLabel.toLowerCase()}`
        }
        action={
          <div className="flex flex-wrap items-center gap-4">
            <Link href={apiUrl(appRoutes.finance.payrollHistory)}>
              Historial
              <Link.Icon />
            </Link>
            <NextLink
              href={appRoutes.finance.hub}
              className="text-sm font-medium text-accent hover:underline"
            >
              Centro financiero
            </NextLink>
          </div>
        }
      />

      {owner ? (
        <BranchSelector branches={branches} value={branchId} onChange={setBranchId} />
      ) : (
        <p className="rounded-xl border border-separator bg-surface-secondary/40 px-3 py-2.5 text-sm">
          Sucursal: <span className="font-medium">{lockedBranch?.name ?? "—"}</span>
        </p>
      )}

      {error ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">{error}</p>
          <Button size="sm" variant="secondary" onPress={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      <PayrollList
        employees={data?.employees ?? []}
        totalCommissions={data?.totalCommissions ?? 0}
        totalPaid={data?.totalPaid ?? 0}
        totalPending={data?.totalPending ?? 0}
        branchId={effectiveBranchId}
        loading={loading}
        period={period}
        onPeriodChange={setPeriod}
        onPaymentRegistered={() => void refetch()}
        showBranch={owner && branchId === "all"}
      />
    </div>
  );
}

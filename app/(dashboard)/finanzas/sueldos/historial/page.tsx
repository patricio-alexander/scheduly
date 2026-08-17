"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import Persons from "@gravity-ui/icons/Persons";
import { PageHeader } from "@/shared/components/ui";
import { BranchSelector, useBranches } from "@/src/features/branches";
import { useAuth } from "@/src/features/auth";
import {
  PayrollHistoryList,
  usePayrollHistory,
} from "@/src/features/payroll";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  getDashboardPeriodDescription,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { isOwnerRole } from "@/shared/utils/roles";

export default function PayrollHistoryPage() {
  const { user } = useAuth();
  const { branches } = useBranches();
  const owner = user ? isOwnerRole(user.role) : false;
  const lockedBranch = user?.branch ?? null;
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [branchId, setBranchId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [period, debouncedSearch, effectiveBranchId]);

  const { data, loading, error, refetch } = usePayrollHistory(
    period,
    effectiveBranchId,
    debouncedSearch,
    page,
  );

  if (!user) return null;

  const branchScoped = !owner && lockedBranch;
  const periodLabel = getDashboardPeriodDescription(period);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<Persons width={24} height={24} />}
        title="Historial de pagos de sueldo"
        description={
          branchScoped
            ? `Pagos registrados en ${lockedBranch.name} · ${periodLabel.toLowerCase()}`
            : `Pagos de sueldo registrados · ${periodLabel.toLowerCase()}`
        }
        action={
          <Link
            href={appRoutes.finance.payroll}
            className="text-sm font-medium text-accent hover:underline"
          >
            Volver a sueldos
          </Link>
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

      <PayrollHistoryList
        payments={data?.items ?? []}
        loading={loading}
        period={period}
        onPeriodChange={setPeriod}
        search={search}
        onSearchChange={setSearch}
        page={page}
        onPageChange={setPage}
        totalCount={data?.totalCount ?? 0}
        totalAmount={data?.totalAmount ?? 0}
        showBranch={owner && branchId === "all"}
      />
    </div>
  );
}

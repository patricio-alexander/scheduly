"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import { fetchPayrollHistory } from "../services/payroll-service";
import type { PayrollHistoryResponse } from "../types";

const PAGE_SIZE = 15;

export function usePayrollHistory(
  period: DashboardPeriod,
  branchId: number | null,
  search: string,
  page: number,
) {
  const [data, setData] = useState<PayrollHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPayrollHistory({
        period,
        branchId,
        q: search,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Error al cargar historial");
    } finally {
      setLoading(false);
    }
  }, [period, branchId, search, page]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

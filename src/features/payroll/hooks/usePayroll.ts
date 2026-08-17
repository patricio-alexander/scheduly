"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import { fetchPayroll } from "../services/payroll-service";
import type { PayrollResponse } from "../types";

export function usePayroll(period: DashboardPeriod, branchId: number | null) {
  const [data, setData] = useState<PayrollResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchPayroll({ period, branchId });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar sueldos");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, branchId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

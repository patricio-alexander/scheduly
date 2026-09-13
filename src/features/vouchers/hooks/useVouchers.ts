"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import { fetchVouchers } from "../services/voucher-service";
import type { VouchersResponse } from "../types";

export function useVouchers(params: {
  period: DashboardPeriod;
  branchId?: number | null;
  /** Evita pedir datos que el rol no puede ver (el API responde 403). */
  enabled?: boolean;
}) {
  const { period, branchId = null, enabled = true } = params;
  const [data, setData] = useState<VouchersResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchVouchers({ period, branchId }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar vales");
    } finally {
      setLoading(false);
    }
  }, [period, branchId, enabled]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

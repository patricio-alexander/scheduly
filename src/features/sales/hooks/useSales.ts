"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import type { PaymentMethodValue } from "@/shared/utils/payment-methods";
import { fetchSales } from "../services/sales-service";
import type { SalesResponse } from "../types";

export function useSales(
  period: DashboardPeriod,
  method: PaymentMethodValue | "all" = "all",
) {
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSales({ period, method });
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  }, [period, method]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

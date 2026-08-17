"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import { fetchPurchases } from "../services/purchase-service";
import type { PurchasesResponse } from "../types";

export function usePurchases(period: DashboardPeriod) {
  const [data, setData] = useState<PurchasesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPurchases({ period });
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Error al cargar compras");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import { fetchDirectProductSales } from "../services/product-sale-service";
import type { DirectProductSalesResponse } from "../types";

export function useDirectProductSales(period: DashboardPeriod) {
  const [data, setData] = useState<DirectProductSalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDirectProductSales({ period });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar ventas");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

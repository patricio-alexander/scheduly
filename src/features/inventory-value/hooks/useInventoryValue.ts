"use client";

import { useCallback, useEffect, useState } from "react";
import type { InventoryValueResponse } from "../types";
import * as service from "../services/inventory-value-service";

export function useInventoryValue() {
  const [data, setData] = useState<InventoryValueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await service.fetchInventoryValue());
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

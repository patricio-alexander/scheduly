"use client";

import { useCallback, useEffect, useState } from "react";
import type { Unit } from "../types";
import * as unitService from "../services/unit-service";

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setUnits(await unitService.getUnits());
    } catch {
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { units, loading, refetch };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/shared/utils/api";

export type BranchRecord = {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  isActive: boolean;
  isMain: boolean;
  sortOrder: number;
};

export function useBranches() {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/branches"), { credentials: "include" });
      if (res.ok) setBranches(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { branches, loading, refetch };
}

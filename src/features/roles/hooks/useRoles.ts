"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "../types";
import * as roleService from "../services/role-service";

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setRoles(await roleService.getRoles());
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { roles, loading, refetch };
}

"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/shared/utils/api";
import {
  DEFAULT_OPERATION_FLAGS,
  normalizeOperationFlags,
  type OperationFlags,
} from "@/shared/utils/operation-flags";

/** Carga flags de operación (columnas, caja, comprobantes) desde /api/settings. */
export function useOperationFlags() {
  const [flags, setFlags] = useState<OperationFlags>(DEFAULT_OPERATION_FLAGS);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/settings"), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as { operationFlags?: unknown };
        if (!cancelled) {
          setFlags(normalizeOperationFlags(json.operationFlags));
        }
      })
      .catch(() => {
        /* defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return flags;
}

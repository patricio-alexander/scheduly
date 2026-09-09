import { apiUrl } from "@/shared/utils/api";
import type { InventoryValueResponse } from "../types";

export async function fetchInventoryValue(): Promise<InventoryValueResponse> {
  const res = await fetch(apiUrl("/api/inventory/value-summary"), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al cargar valorización");
  }
  return res.json();
}

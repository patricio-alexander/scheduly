import { apiUrl } from "@/shared/utils/api";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import type { PaymentMethodValue } from "@/shared/utils/payment-methods";
import type { SalesResponse } from "../types";

export async function fetchSales(params: {
  period: DashboardPeriod;
  method?: PaymentMethodValue | "all";
  q?: string;
}): Promise<SalesResponse> {
  const search = new URLSearchParams({ period: params.period });
  if (params.method && params.method !== "all") {
    search.set("method", params.method);
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  const res = await fetch(apiUrl(`/api/payments?${search.toString()}`));
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al cargar ventas");
  }
  return res.json() as Promise<SalesResponse>;
}

import { apiUrl } from "@/shared/utils/api";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import type {
  CreateDirectProductSalePayload,
  DirectProductSalesResponse,
} from "../types";

const BASE = apiUrl("/api/product-sales");

export async function fetchDirectProductSales(params: {
  period: DashboardPeriod;
}): Promise<DirectProductSalesResponse> {
  const url = new URL(BASE, window.location.origin);
  url.searchParams.set("period", params.period);
  const res = await fetch(url.toString(), { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("Error al obtener ventas directas");
  return res.json();
}

export async function createDirectProductSale(
  data: CreateDirectProductSalePayload,
): Promise<unknown> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      json && typeof json === "object" && "message" in json
        ? String((json as { message: unknown }).message)
        : "Error al registrar la venta",
    );
  }
  return json;
}

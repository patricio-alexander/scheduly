import { apiUrl } from "@/shared/utils/api";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import type {
  CreatePurchasePayload,
  PurchasesResponse,
  Supplier,
} from "../types";
import type { SupplierFormData } from "../lib/purchase-schema";

const PURCHASES_BASE = apiUrl("/api/purchases");
const SUPPLIERS_BASE = apiUrl("/api/suppliers");

export async function fetchPurchases(params: {
  period: DashboardPeriod;
}): Promise<PurchasesResponse> {
  const url = new URL(PURCHASES_BASE, window.location.origin);
  url.searchParams.set("period", params.period);
  const res = await fetch(url.toString(), { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("Error al obtener compras");
  return res.json();
}

export async function createPurchase(
  data: CreatePurchasePayload,
): Promise<unknown> {
  const res = await fetch(PURCHASES_BASE, {
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
        : "Error al registrar la compra",
    );
  }
  return json;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const res = await fetch(SUPPLIERS_BASE, { credentials: "include" });
  if (!res.ok) throw new Error("Error al obtener proveedores");
  return res.json();
}

export async function createSupplier(data: SupplierFormData): Promise<Supplier> {
  const res = await fetch(SUPPLIERS_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear el proveedor");
  return res.json();
}

export async function updateSupplier(
  id: number,
  data: SupplierFormData,
): Promise<Supplier> {
  const res = await fetch(`${SUPPLIERS_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar el proveedor");
  return res.json();
}

export async function deleteSupplier(id: number): Promise<void> {
  const res = await fetch(`${SUPPLIERS_BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al eliminar el proveedor");
}

import { apiUrl } from "@/shared/utils/api";
import type { Service } from "../types";
import type { ServiceFormData } from "../lib/service-schema";

const BASE = apiUrl("/api/services");

export async function getServices(): Promise<Service[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error al obtener servicios");
  return res.json();
}

export async function getService(id: number): Promise<Service> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Error al obtener el servicio");
  return res.json();
}

export async function createService(
  data: ServiceFormData
): Promise<Service> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear el servicio");
  return res.json();
}

export async function updateService(
  id: number,
  data: ServiceFormData
): Promise<Service> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar el servicio");
  return res.json();
}

export async function deleteService(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar el servicio");
}

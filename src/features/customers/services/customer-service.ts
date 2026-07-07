import { apiUrl } from "@/shared/utils/api";
import type { Customer } from "../types";
import type { CustomerFormData } from "../lib/customer-schema";

const BASE = apiUrl("/api/customers");

export async function getCustomers(): Promise<Customer[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error al obtener clientes");
  return res.json();
}

export async function getCustomer(id: number): Promise<Customer> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Error al obtener el cliente");
  return res.json();
}

export async function createCustomer(
  data: CustomerFormData
): Promise<Customer> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear el cliente");
  return res.json();
}

export async function updateCustomer(
  id: number,
  data: CustomerFormData
): Promise<Customer> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar el cliente");
  return res.json();
}

export async function deleteCustomer(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar el cliente");
}

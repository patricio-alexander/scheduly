import { apiUrl } from "@/shared/utils/api";
import type { Product } from "../types";
import type { ProductFormData } from "../lib/product-schema";

const BASE = apiUrl("/api/products");

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error al obtener productos");
  return res.json();
}

export async function getProduct(id: number): Promise<Product> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Error al obtener el producto");
  return res.json();
}

export async function createProduct(data: ProductFormData): Promise<Product> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear el producto");
  return res.json();
}

export async function updateProduct(
  id: number,
  data: ProductFormData
): Promise<Product> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar el producto");
  return res.json();
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar el producto");
}

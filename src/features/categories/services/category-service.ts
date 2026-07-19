import { apiUrl } from "@/shared/utils/api";
import type { Category } from "../types";
import type { CategoryFormData } from "../lib/category-schema";

const BASE = apiUrl("/api/categories");

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error al obtener categorías");
  return res.json();
}

export async function createCategory(data: CategoryFormData): Promise<Category> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error al crear la categoría");
  }
  return res.json();
}

export async function updateCategory(
  id: number,
  data: CategoryFormData,
): Promise<Category> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error al actualizar la categoría");
  }
  return res.json();
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error al eliminar la categoría");
  }
}

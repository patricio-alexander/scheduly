import { apiUrl } from "@/shared/utils/api";
import type { Unit } from "../types";
import type { UnitFormData } from "../lib/unit-schema";

const BASE = apiUrl("/api/units");

export async function getUnits(): Promise<Unit[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error al obtener unidades");
  return res.json();
}

export async function createUnit(data: UnitFormData): Promise<Unit> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error al crear la unidad");
  }
  return res.json();
}

export async function updateUnit(
  id: number,
  data: UnitFormData,
): Promise<Unit> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error al actualizar la unidad");
  }
  return res.json();
}

export async function deleteUnit(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error al eliminar la unidad");
  }
}

import { apiUrl } from "@/shared/utils/api";
import type { Role } from "../types";
import type { RoleFormData } from "../lib/role-schema";

const BASE = apiUrl("/api/roles");

export async function getRoles(): Promise<Role[]> {
  const res = await fetch(BASE, { credentials: "include" });
  if (!res.ok) throw new Error("Error al obtener roles");
  return res.json();
}

export async function createRole(data: RoleFormData): Promise<Role> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error al crear el rol");
  }
  return res.json();
}

export async function updateRole(
  id: number,
  data: RoleFormData,
): Promise<Role> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error al actualizar el rol");
  }
  return res.json();
}

export async function deleteRole(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error al eliminar el rol");
  }
}

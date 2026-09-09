import { apiUrl } from "@/shared/utils/api";
import type { AuthUser } from "../types";

export async function loginUser(
  username: string,
  password: string
): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Error al iniciar sesión");
  }

  return res.json();
}

export async function logoutUser(): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  });
  if (!res.ok) {
    throw new Error("No se pudo cerrar la sesión en el servidor");
  }
}

export async function changeUserRole(roleId: number): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/change-role"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ roleId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || "Error al cambiar rol",
    );
  }

  const data = (await res.json()) as AuthUser & { message?: string };
  return data;
}

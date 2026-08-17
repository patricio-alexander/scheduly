import { apiUrl } from "@/shared/utils/api";

export async function activateCustomerPortal(
  customerId: number,
  password: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/customers/${customerId}/account`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al activar cuenta");
  }
}

export async function deactivateCustomerPortal(customerId: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/customers/${customerId}/account`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al desactivar cuenta");
}

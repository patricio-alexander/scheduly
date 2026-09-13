import { apiUrl } from "@/shared/utils/api";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import type { CreateVoucherPayload, VouchersResponse } from "../types";

const BASE = apiUrl("/api/operation/vouchers");

async function readError(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as {
    message?: string;
  } | null;
  throw new Error(body?.message ?? fallback);
}

export async function fetchVouchers(params: {
  period: DashboardPeriod;
  branchId?: number | null;
}): Promise<VouchersResponse> {
  const url = new URL(BASE, window.location.origin);
  url.searchParams.set("period", params.period);
  if (params.branchId) {
    url.searchParams.set("branchId", String(params.branchId));
  }
  const res = await fetch(url.toString(), {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) await readError(res, "Error al obtener los vales");
  return res.json() as Promise<VouchersResponse>;
}

export async function createVoucher(
  data: CreateVoucherPayload,
): Promise<unknown> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) await readError(res, "Error al registrar el vale");
  return res.json();
}

export async function setVoucherSettled(
  id: number,
  settled: boolean,
): Promise<unknown> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ settled }),
  });
  if (!res.ok) await readError(res, "Error al actualizar el vale");
  return res.json();
}

export async function deleteVoucher(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) await readError(res, "Error al anular el vale");
}

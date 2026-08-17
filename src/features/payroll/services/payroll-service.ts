import { apiUrl } from "@/shared/utils/api";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import type {
  PayrollResponse,
  PayrollHistoryResponse,
  RegisterEmployeePaymentPayload,
} from "../types";

const BASE = apiUrl("/api/finance/payroll");

export async function fetchPayroll(params: {
  period: DashboardPeriod;
  branchId?: number | null;
}): Promise<PayrollResponse> {
  const url = new URL(BASE, window.location.origin);
  url.searchParams.set("period", params.period);
  if (params.branchId) {
    url.searchParams.set("branchId", String(params.branchId));
  }
  const res = await fetch(url.toString(), { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("Error al obtener sueldos");
  return res.json();
}

export async function registerEmployeePayment(
  data: RegisterEmployeePaymentPayload,
): Promise<unknown> {
  const res = await fetch(BASE, {
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
        : "Error al registrar el pago",
    );
  }
  return json;
}

export async function fetchPayrollHistory(params: {
  period: DashboardPeriod;
  branchId?: number | null;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PayrollHistoryResponse> {
  const url = new URL(`${BASE}/history`, window.location.origin);
  url.searchParams.set("period", params.period);
  if (params.branchId) {
    url.searchParams.set("branchId", String(params.branchId));
  }
  if (params.q?.trim()) {
    url.searchParams.set("q", params.q.trim());
  }
  if (params.page != null) {
    url.searchParams.set("page", String(params.page));
  }
  if (params.pageSize != null) {
    url.searchParams.set("pageSize", String(params.pageSize));
  }

  const res = await fetch(url.toString(), { cache: "no-store", credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al cargar historial de pagos");
  }
  return res.json() as Promise<PayrollHistoryResponse>;
}

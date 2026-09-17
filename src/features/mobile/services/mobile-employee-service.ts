import { apiUrl } from "@/shared/utils/api";
import type { ProfileData } from "@/src/features/profile";
import type {
  MobileCalendarEvent,
  MobileEmployeeData,
  MobilePaymentRequest,
} from "../types";

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
  };
  return new Error(body.message || fallback);
}

export async function getMobileEmployeeData() {
  const response = await fetch(apiUrl("/api/employee/me"), {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await responseError(
      response,
      "No se pudo cargar la información del empleado",
    );
  }

  return (await response.json()) as MobileEmployeeData;
}

export async function getMobileEmployeeProfile(accountId: number) {
  const response = await fetch(apiUrl(`/api/profile?userId=${accountId}`), {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await responseError(response, "No se pudo cargar el perfil");
  }

  return (await response.json()) as ProfileData;
}

export async function getMobileEmployeeCalendar() {
  const response = await fetch(apiUrl("/api/appointments?view=mine"), {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await responseError(response, "No se pudo cargar la agenda");
  }

  const body = (await response.json()) as { events?: MobileCalendarEvent[] };
  return Array.isArray(body.events) ? body.events : [];
}

export async function getMobilePaymentRequests() {
  const response = await fetch(apiUrl("/api/finance/my-payroll"), {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await responseError(
      response,
      "No se pudieron consultar los pagos pendientes",
    );
  }

  const body = (await response.json()) as {
    lines?: Array<{
      id: number;
      weekId: number;
      periodStart: string;
      periodEnd: string;
      branchName: string | null;
      paymentRequest: {
        requestedAt: string;
        amount: number;
        method: string;
        notes: string;
      } | null;
    }>;
  };

  return (body.lines ?? []).flatMap<MobilePaymentRequest>((line) =>
    line.paymentRequest
      ? [
          {
            lineId: line.id,
            weekId: line.weekId,
            periodStart: line.periodStart,
            periodEnd: line.periodEnd,
            branchName: line.branchName,
            ...line.paymentRequest,
          },
        ]
      : [],
  );
}

export async function acceptMobilePayment(lineId: number) {
  const response = await fetch(apiUrl("/api/finance/my-payroll"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineId, action: "accept-payment" }),
  });

  if (!response.ok) {
    throw await responseError(response, "No se pudo confirmar el pago");
  }
}

export async function rejectMobilePayment(lineId: number) {
  const response = await fetch(apiUrl("/api/finance/my-payroll"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineId, action: "reject-payment" }),
  });

  if (!response.ok) {
    throw await responseError(response, "No se pudo rechazar el pago");
  }
}

export async function updateMobileEmployeeProfile(
  accountId: number,
  data: FormData | Partial<ProfileData>,
) {
  const multipart = data instanceof FormData;
  const response = await fetch(apiUrl(`/api/profile?userId=${accountId}`), {
    method: "PUT",
    credentials: "include",
    ...(multipart
      ? { body: data }
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
  });

  if (!response.ok) {
    throw await responseError(response, "No se pudo actualizar el perfil");
  }

  return (await response.json()) as ProfileData;
}

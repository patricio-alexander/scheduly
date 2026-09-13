import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import type { PaymentMethodValue } from "@/shared/utils/payment-methods";

export interface VoucherRecord {
  id: number;
  employee: { id: number; name: string };
  branch: { id: number; name: string } | null;
  amount: number;
  method: PaymentMethodValue;
  reason: string;
  issuedAt: string;
  /** Fecha en que se descontó en la liquidación; null = sigue pendiente. */
  settledAt: string | null;
  registeredBy: { id: number; name: string };
}

export interface VoucherEmployee {
  personId: number;
  name: string;
  branch: { id: number; name: string } | null;
  /** Saldo histórico sin descontar, no solo el del período visible. */
  pendingAmount: number;
  pendingCount: number;
}

export interface VouchersResponse {
  period: DashboardPeriod;
  branchId: number | null;
  totals: {
    periodTotal: number;
    periodSettled: number;
    pendingTotal: number;
    count: number;
  };
  employees: VoucherEmployee[];
  items: VoucherRecord[];
}

export interface CreateVoucherPayload {
  userId: number;
  amount: number;
  method: PaymentMethodValue;
  reason?: string;
  branchId?: number | null;
  issuedAt?: string;
}

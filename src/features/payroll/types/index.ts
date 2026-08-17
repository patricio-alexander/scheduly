import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import type { SaleMethod } from "@/src/features/sales/types";

export interface PayrollCommissionLine {
  appointmentId: number;
  title: string;
  appointmentDate: string;
  baseAmount: number;
  amount: number;
}

export interface EmployeePaymentRecord {
  id: number;
  amount: number;
  method: SaleMethod;
  paidAt: string;
  notes: string;
  registeredBy: { id: number; name: string };
}

export interface PayrollEmployee {
  userId: number;
  name: string;
  branch: { id: number; name: string } | null;
  completedAppointments: number;
  commissionTotal: number;
  paidTotal: number;
  pendingAmount: number;
  isFullyPaid: boolean;
  commissionLines: PayrollCommissionLine[];
  payments: EmployeePaymentRecord[];
}

export interface PayrollPaymentLogEntry {
  id: number;
  userId: number;
  employeeName: string;
  amount: number;
  method: SaleMethod;
  paidAt: string;
  notes: string;
  branchName?: string | null;
  registeredBy: { id: number; name: string };
}

export interface PayrollResponse {
  period: DashboardPeriod;
  branchId: number | null;
  totalCommissions: number;
  totalPaid: number;
  totalPending: number;
  employeeCount: number;
  employees: PayrollEmployee[];
}

export interface PayrollHistoryResponse {
  period: DashboardPeriod;
  branchId: number | null;
  page: number;
  pageSize: number;
  totalCount: number;
  totalAmount: number;
  items: PayrollPaymentLogEntry[];
}

export interface RegisterEmployeePaymentPayload {
  userId: number;
  amount: number;
  method: SaleMethod;
  notes?: string;
  branchId?: number | null;
  period?: DashboardPeriod;
}

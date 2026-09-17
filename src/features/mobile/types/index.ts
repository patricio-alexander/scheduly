export interface MobileAppointment {
  id: number;
  title: string;
  status: string;
  date: string;
  customer: string;
  branch: string | null;
  services: string;
}

export interface MobileCommission {
  id: number;
  amount: number;
  ratePct: number;
  createdAt: string;
  title: string;
  appointmentDate: string;
}

export interface MobileSalaryPayment {
  id: number;
  amount: number;
  method: string;
  paidAt: string;
  notes: string;
  branch: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  registeredBy: string;
}

export interface MobileEmployeeData {
  user: {
    id: number;
    name: string;
    role: string;
  };
  todayAppointments: MobileAppointment[];
  weekAppointments: number;
  commissionTotal: number;
  paidTotal: number;
  commissions: MobileCommission[];
  salaryPayments: MobileSalaryPayment[];
}

export interface MobileCalendarEvent {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    description: string;
    customer: string;
    user: string;
    status: string;
    branchId: number | null;
    userId: number;
  };
}

export interface MobilePaymentRequest {
  lineId: number;
  weekId: number;
  periodStart: string;
  periodEnd: string;
  branchName: string | null;
  amount: number;
  method: string;
  notes: string;
  requestedAt: string;
}

export type MobileTab = "home" | "agenda" | "commissions" | "profile";

export type SaleMethod = "cash" | "card" | "transfer";

export interface SaleLineService {
  id: number;
  name: string;
  price: number;
}

export interface SaleLineProduct {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface SaleRecord {
  id: number;
  appointmentId: number;
  amount: number;
  method: SaleMethod;
  paidAt: string;
  notes: string;
  customer: { id: number; name: string };
  staff: { id: number; name: string };
  title: string;
  appointmentDate: string;
  services: SaleLineService[];
  products: SaleLineProduct[];
  itemsSummary: string;
}

export interface SalesSummaryByMethod {
  method: SaleMethod;
  count: number;
  amount: number;
}

export interface SalesResponse {
  period: "today" | "week" | "month";
  totalCount: number;
  totalAmount: number;
  byMethod: SalesSummaryByMethod[];
  sales: SaleRecord[];
}

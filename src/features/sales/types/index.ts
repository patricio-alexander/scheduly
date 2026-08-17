export type SaleMethod = "cash" | "card" | "transfer";

export interface SaleLineService {
  id: number;
  name: string;
  price: number;
  commissionPct: number;
}

export interface SaleCommission {
  amount: number;
  ratePct: number;
  baseAmount: number;
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
  branch: { id: number; name: string } | null;
  title: string;
  description: string;
  status: string;
  appointmentDate: string;
  services: SaleLineService[];
  products: SaleLineProduct[];
  itemsSummary: string;
  commission: SaleCommission | null;
}

export interface ProductSaleLine {
  id: string;
  source: "appointment" | "direct";
  paymentId: number | null;
  directSaleId: number | null;
  appointmentId: number | null;
  paidAt: string;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customer: { id: number | null; name: string };
  staff: { id: number; name: string };
  branch: { id: number; name: string } | null;
  originLabel: string;
}

export interface DirectProductSaleRecord {
  id: number;
  amount: number;
  method: SaleMethod;
  paidAt: string;
  notes: string;
  customer: { id: number; name: string } | null;
  staff: { id: number; name: string };
  branch: { id: number; name: string } | null;
  products: Array<{
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  itemsSummary: string;
}

export interface DirectProductSalesResponse {
  period: "today" | "week" | "month";
  totalCount: number;
  totalAmount: number;
  byMethod: SalesSummaryByMethod[];
  sales: DirectProductSaleRecord[];
}

export interface CreateDirectProductSalePayload {
  customerId?: number | null;
  branchId?: number | null;
  method: SaleMethod;
  notes?: string;
  lines: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
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

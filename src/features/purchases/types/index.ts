export type PurchaseMethod = "cash" | "card" | "transfer";

export interface PurchaseLineProduct {
  id: number;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseRecord {
  id: number;
  amount: number;
  method: PurchaseMethod;
  purchasedAt: string;
  notes: string;
  supplier: { id: number; name: string } | null;
  staff: { id: number; name: string };
  products: PurchaseLineProduct[];
  itemsSummary: string;
}

export interface PurchasesSummaryByMethod {
  method: PurchaseMethod;
  count: number;
  amount: number;
}

export interface PurchasesResponse {
  period: "today" | "week" | "month";
  totalCount: number;
  totalAmount: number;
  byMethod: PurchasesSummaryByMethod[];
  purchases: PurchaseRecord[];
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  email: string;
  taxId: string | null;
  address: string;
}

export interface PurchaseLineDraft {
  productId: number;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchasePayload {
  supplierId?: number | null;
  branchId?: number | null;
  purchasedAt?: string;
  method: PurchaseMethod;
  notes?: string;
  lines: PurchaseLineDraft[];
}

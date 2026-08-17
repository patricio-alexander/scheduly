export type InvoiceLine = {
  code: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  ivaRate: number;
};

export type ElectronicDocumentSummary = {
  id: number;
  type: string;
  status: string;
  accessKey: string;
  series: string;
  issueDate: string;
  buyerName: string;
  buyerIdentification: string;
  total: number;
  environment: string;
  authorizationNumber: string | null;
  branchName: string | null;
  sourceType: "appointment" | "product_sale" | null;
  sourceId: number | null;
};

export type PendingSale = {
  kind: "appointment" | "product_sale";
  id: number;
  paymentId?: number;
  paidAt: string;
  amount: number;
  customerName: string;
  customerIdentification: string | null;
  branchName: string | null;
  description: string;
};

export type PendingSalesPage = {
  items: PendingSale[];
  total: number;
  page: number;
  pageSize: number;
};

export type SriMessage = {
  type?: string;
  message?: string;
  identifier?: string;
};

export type InvoicePreviewData = {
  issuer: {
    name: string;
    tradeName: string;
    ruc: string;
    address: string;
    obligationAccounting: boolean;
    logoPath: string | null;
  };
  buyer: {
    name: string;
    identification: string;
    address: string;
    email: string;
    phone: string;
  };
  series: string;
  environment: "pruebas" | "produccion";
  branchName: string | null;
  lines: InvoiceLine[];
  subtotal: number;
  ivaAmount: number;
  total: number;
  issueDate: string;
};

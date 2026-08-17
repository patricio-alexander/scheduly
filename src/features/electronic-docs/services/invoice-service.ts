import type { PrismaClient } from "@/generated/prisma/client";
import { toAmount } from "@/shared/utils/money";
import { buildAccessKey, formatSeries, randomNumericCode } from "../lib/access-key";
import { resolveEmissionCodes } from "../lib/emission-point";
import {
  buildInvoiceXml,
  computeInvoiceTotals,
  defaultIvaRate,
} from "../lib/invoice-xml";
import { signInvoiceXml } from "../lib/document-signer";
import {
  queryInvoiceAuthorization,
  sendInvoiceToSri,
  type SriAuthResult,
} from "../lib/sri-client";
import type { ElectronicDocumentSummary, InvoiceLine, InvoicePreviewData, PendingSale, PendingSalesPage } from "../types";

type Db = Pick<
  PrismaClient,
  | "businessSettings"
  | "sriSettings"
  | "branch"
  | "electronicDocument"
  | "payment"
  | "productSale"
  | "appointment"
  | "customer"
>;

function normalizeRuc(value: string) {
  return value.replace(/\D/g, "").slice(0, 13);
}

function buyerFromCustomer(customer: {
  name: string;
  lastnames: string;
  identificationType: string | null;
  identification: string | null;
  address: string;
  email: string;
  phone: string;
}) {
  const id = customer.identification?.trim();
  if (id) {
    return {
      name: `${customer.name} ${customer.lastnames}`.trim(),
      identification: id,
      identificationType: customer.identificationType ?? "05",
      address: customer.address,
      email: customer.email,
      phone: customer.phone,
    };
  }
  return {
    name: "CONSUMIDOR FINAL",
    identification: "9999999999999",
    identificationType: "07",
    address: customer.address || "S/N",
    email: customer.email,
    phone: customer.phone,
  };
}

function lineFromService(service: { id: number; name: string; price: number }): InvoiceLine {
  return {
    code: `SRV-${String(service.id).padStart(3, "0")}`,
    description: service.name,
    qty: 1,
    unitPrice: toAmount(service.price),
    discount: 0,
    ivaRate: defaultIvaRate(),
  };
}

function lineFromProduct(
  product: { id: number; name: string; price: number },
  qty: number,
): InvoiceLine {
  return {
    code: `PRD-${String(product.id).padStart(3, "0")}`,
    description: product.name,
    qty,
    unitPrice: toAmount(product.price),
    discount: 0,
    ivaRate: defaultIvaRate(),
  };
}

async function nextSequential(
  db: Db,
  branchId: number | null,
  estab: string,
  ptoEmi: string,
) {
  const last = await db.electronicDocument.findFirst({
    where: { branchId: branchId ?? undefined, estab, ptoEmi },
    orderBy: { id: "desc" },
    select: { secuencial: true },
  });
  const next = last ? Number(last.secuencial) + 1 : 1;
  return String(next).padStart(9, "0");
}

async function getIssuerContext(db: Db) {
  const [business, sri] = await Promise.all([
    db.businessSettings.findUnique({ where: { id: 1 } }),
    db.sriSettings.findUnique({ where: { id: 1 } }),
  ]);
  const ruc = normalizeRuc(business?.ruc ?? "");
  if (!ruc || ruc.length !== 13) {
    throw new Error("Configura el RUC del negocio en Sistema → Configuración");
  }
  return {
    business,
    sri,
    issuer: {
      ruc,
      name: business?.businessName ?? "Scheduly",
      tradeName: business?.tradeName || business?.businessName || "Scheduly",
      address: business?.address ?? "",
      obligationAccounting: business?.obligationAccounting ?? true,
    },
    environment: (sri?.environment === "produccion" ? "produccion" : "pruebas") as
      | "pruebas"
      | "produccion",
  };
}

export function serializeDocument(doc: {
  id: number;
  type: string;
  status: string;
  accessKey: string;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  issueDate: Date;
  buyerName: string;
  buyerIdentification: string;
  total: number;
  environment: string;
  authorizationNumber: string | null;
  branch?: { name: string } | null;
  paymentId: number | null;
  productSaleId: number | null;
}): ElectronicDocumentSummary {
  return {
    id: doc.id,
    type: doc.type,
    status: doc.status,
    accessKey: doc.accessKey,
    series: formatSeries(doc.estab, doc.ptoEmi, doc.secuencial),
    issueDate: doc.issueDate.toISOString(),
    buyerName: doc.buyerName,
    buyerIdentification: doc.buyerIdentification,
    total: doc.total,
    environment: doc.environment,
    authorizationNumber: doc.authorizationNumber,
    branchName: doc.branch?.name ?? null,
    sourceType: doc.paymentId ? "appointment" : doc.productSaleId ? "product_sale" : null,
    sourceId: doc.paymentId ?? doc.productSaleId,
  };
}

function mapPaymentToPendingSale(
  payment: {
    id: number;
    amount: number;
    paidAt: Date;
    appointment: {
      id: number;
      title: string;
      customer: { name: string; lastnames: string; identification: string | null };
      branch: { name: string } | null;
      services: { service: { name: string } }[];
      products: { product: { name: string } }[];
    };
  },
): PendingSale {
  const apt = payment.appointment;
  const customer = apt.customer;
  const parts = [
    ...apt.services.map((s) => s.service.name),
    ...apt.products.map((p) => p.product.name),
  ];
  return {
    kind: "appointment",
    id: apt.id,
    paymentId: payment.id,
    paidAt: payment.paidAt.toISOString(),
    amount: payment.amount,
    customerName: `${customer.name} ${customer.lastnames}`.trim(),
    customerIdentification: customer.identification,
    branchName: apt.branch?.name ?? null,
    description: parts.join(", ") || apt.title,
  };
}

function mapProductSaleToPendingSale(
  sale: {
    id: number;
    amount: number;
    paidAt: Date;
    customer: { name: string; lastnames: string; identification: string | null } | null;
    branch: { name: string } | null;
    lines: { product: { name: string } }[];
  },
): PendingSale {
  return {
    kind: "product_sale",
    id: sale.id,
    paidAt: sale.paidAt.toISOString(),
    amount: sale.amount,
    customerName: sale.customer
      ? `${sale.customer.name} ${sale.customer.lastnames}`.trim()
      : "Consumidor final",
    customerIdentification: sale.customer?.identification ?? null,
    branchName: sale.branch?.name ?? null,
    description: sale.lines.map((l) => l.product.name).join(", "),
  };
}

export async function listPendingSales(
  db: Db,
  options: { page?: number; pageSize?: number } = {},
): Promise<PendingSalesPage> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));

  const [payments, sales] = await Promise.all([
    db.payment.findMany({
      where: { electronicDocument: null },
      select: { id: true, appointmentId: true, paidAt: true },
      orderBy: { paidAt: "desc" },
    }),
    db.productSale.findMany({
      where: { electronicDocument: null },
      select: { id: true, paidAt: true },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  type PendingKey = {
    kind: "appointment" | "product_sale";
    id: number;
    paymentId?: number;
    paidAt: Date;
  };

  const keys: PendingKey[] = [
    ...payments.map((payment) => ({
      kind: "appointment" as const,
      id: payment.appointmentId,
      paymentId: payment.id,
      paidAt: payment.paidAt,
    })),
    ...sales.map((sale) => ({
      kind: "product_sale" as const,
      id: sale.id,
      paidAt: sale.paidAt,
    })),
  ].sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());

  const total = keys.length;
  const slice = keys.slice((page - 1) * pageSize, page * pageSize);

  if (slice.length === 0) {
    return { items: [], total, page, pageSize };
  }

  const paymentIds = slice
    .filter((key) => key.kind === "appointment")
    .map((key) => key.paymentId!);
  const saleIds = slice
    .filter((key) => key.kind === "product_sale")
    .map((key) => key.id);

  const paymentInclude = {
    appointment: {
      include: {
        customer: true,
        branch: { select: { name: true } },
        services: { include: { service: true } },
        products: { include: { product: true } },
      },
    },
  } as const;

  const saleInclude = {
    customer: true,
    branch: { select: { name: true } },
    lines: { include: { product: true } },
  } as const;

  const [paymentDetails, saleDetails] = await Promise.all([
    paymentIds.length > 0
      ? db.payment.findMany({
          where: { id: { in: paymentIds } },
          include: paymentInclude,
        })
      : Promise.resolve([]),
    saleIds.length > 0
      ? db.productSale.findMany({
          where: { id: { in: saleIds } },
          include: saleInclude,
        })
      : Promise.resolve([]),
  ]);

  const paymentById = new Map(
    paymentDetails.map((payment) => [payment.id, mapPaymentToPendingSale(payment)]),
  );
  const saleById = new Map(
    saleDetails.map((sale) => [sale.id, mapProductSaleToPendingSale(sale)]),
  );

  const items = slice.flatMap((key) => {
    if (key.kind === "appointment") {
      const item = paymentById.get(key.paymentId!);
      return item ? [item] : [];
    }
    const item = saleById.get(key.id);
    return item ? [item] : [];
  });

  return { items, total, page, pageSize };
}

export async function createInvoiceFromPayment(db: Db, paymentId: number) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      electronicDocument: true,
      appointment: {
        include: {
          customer: true,
          branch: true,
          services: { include: { service: true } },
          products: { include: { product: true } },
        },
      },
    },
  });
  if (!payment) throw new Error("Pago no encontrado");
  if (payment.electronicDocument) throw new Error("Este pago ya tiene factura");

  const branch = payment.appointment.branch;
  if (!branch) throw new Error("El turno no tiene sucursal asignada");

  const lines: InvoiceLine[] = [
    ...payment.appointment.services.map((row) => lineFromService(row.service)),
    ...payment.appointment.products.map((row) =>
      lineFromProduct(row.product, row.quantity),
    ),
  ];
  if (lines.length === 0) {
    lines.push({
      code: "SRV-000",
      description: payment.appointment.title,
      qty: 1,
      unitPrice: toAmount(payment.amount) / 1.15,
      discount: 0,
      ivaRate: defaultIvaRate(),
    });
  }

  return createDraftInvoice(db, {
    branch,
    paymentId: payment.id,
    productSaleId: null,
    buyer: buyerFromCustomer(payment.appointment.customer),
    lines,
  });
}

export async function createInvoiceFromProductSale(db: Db, productSaleId: number) {
  const sale = await db.productSale.findUnique({
    where: { id: productSaleId },
    include: {
      electronicDocument: true,
      customer: true,
      branch: true,
      lines: { include: { product: true } },
    },
  });
  if (!sale) throw new Error("Venta no encontrada");
  if (sale.electronicDocument) throw new Error("Esta venta ya tiene factura");

  const lines = sale.lines.map((row) =>
    lineFromProduct(row.product, row.quantity),
  );
  const buyer = sale.customer
    ? buyerFromCustomer(sale.customer)
    : buyerFromCustomer({
        name: "Consumidor",
        lastnames: "Final",
        identificationType: "07",
        identification: "9999999999999",
        address: "S/N",
        email: "",
        phone: "",
      });

  return createDraftInvoice(db, {
    branch: sale.branch,
    paymentId: null,
    productSaleId: sale.id,
    buyer,
    lines,
  });
}

async function createDraftInvoice(
  db: Db,
  input: {
    branch: {
      id: number;
      code: string;
      sortOrder: number;
      emissionEstablishment: string;
      emissionPoint: string;
    };
    paymentId: number | null;
    productSaleId: number | null;
    buyer: {
      name: string;
      identification: string;
      identificationType: string;
      address: string;
      email: string;
      phone: string;
    };
    lines: InvoiceLine[];
  },
) {
  const { issuer, environment, sri } = await getIssuerContext(db);
  const { estab, ptoEmi } = resolveEmissionCodes(input.branch);
  const secuencial = await nextSequential(db, input.branch.id, estab, ptoEmi);
  const issueDate = new Date();
  const accessKey = buildAccessKey({
    issueDate,
    docType: "01",
    ruc: issuer.ruc,
    environment: environment === "produccion" ? "2" : "1",
    estab,
    ptoEmi,
    secuencial,
    numericCode: randomNumericCode(),
  });
  const totals = computeInvoiceTotals(input.lines);
  const xmlUnsigned = buildInvoiceXml({
    accessKey,
    environment: environment === "produccion" ? "2" : "1",
    issueDate,
    estab,
    ptoEmi,
    secuencial,
    issuer,
    buyer: input.buyer,
    lines: input.lines,
    ...totals,
  });

  const doc = await db.electronicDocument.create({
    data: {
      type: "invoice",
      status: "draft",
      branchId: input.branch.id,
      paymentId: input.paymentId,
      productSaleId: input.productSaleId,
      accessKey,
      estab,
      ptoEmi,
      secuencial,
      environment,
      issueDate,
      buyerName: input.buyer.name,
      buyerIdentification: input.buyer.identification,
      buyerIdentificationType: input.buyer.identificationType,
      buyerAddress: input.buyer.address,
      buyerEmail: input.buyer.email,
      buyerPhone: input.buyer.phone,
      subtotal: totals.subtotal,
      ivaAmount: totals.ivaAmount,
      total: totals.total,
      lines: input.lines,
      xmlUnsigned,
    },
    include: { branch: { select: { name: true } } },
  });

  if (
    sri?.autoEmitOnPayment &&
    sri.certStoragePath &&
    sri.certPasswordEnc
  ) {
    return issueElectronicDocument(db, doc.id);
  }

  return doc;
}

async function buildInvoicePreviewPayload(
  db: Db,
  input: {
    branch: {
      id: number;
      code: string;
      sortOrder: number;
      emissionEstablishment: string;
      emissionPoint: string;
      name?: string;
    };
    buyer: {
      name: string;
      identification: string;
      identificationType: string;
      address: string;
      email: string;
      phone: string;
    };
    lines: InvoiceLine[];
  },
): Promise<InvoicePreviewData> {
  const { business, issuer, environment } = await getIssuerContext(db);
  const { estab, ptoEmi } = resolveEmissionCodes(input.branch);
  const secuencial = await nextSequential(db, input.branch.id, estab, ptoEmi);
  const totals = computeInvoiceTotals(input.lines);
  const issueDate = new Date();

  return {
    issuer: {
      name: issuer.name,
      tradeName: issuer.tradeName,
      ruc: issuer.ruc,
      address: issuer.address,
      obligationAccounting: issuer.obligationAccounting,
      logoPath: business?.logoPath ?? null,
    },
    buyer: {
      name: input.buyer.name,
      identification: input.buyer.identification,
      address: input.buyer.address,
      email: input.buyer.email,
      phone: input.buyer.phone,
    },
    series: formatSeries(estab, ptoEmi, secuencial),
    environment,
    branchName: input.branch.name ?? null,
    lines: input.lines,
    ...totals,
    issueDate: issueDate.toISOString(),
  };
}

export async function previewInvoiceFromPayment(
  db: Db,
  paymentId: number,
): Promise<InvoicePreviewData> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      electronicDocument: true,
      appointment: {
        include: {
          customer: true,
          branch: true,
          services: { include: { service: true } },
          products: { include: { product: true } },
        },
      },
    },
  });
  if (!payment) throw new Error("Pago no encontrado");
  if (payment.electronicDocument) throw new Error("Este pago ya tiene factura");

  const branch = payment.appointment.branch;
  if (!branch) throw new Error("El turno no tiene sucursal asignada");

  const lines: InvoiceLine[] = [
    ...payment.appointment.services.map((row) => lineFromService(row.service)),
    ...payment.appointment.products.map((row) =>
      lineFromProduct(row.product, row.quantity),
    ),
  ];
  if (lines.length === 0) {
    lines.push({
      code: "SRV-000",
      description: payment.appointment.title,
      qty: 1,
      unitPrice: toAmount(payment.amount) / 1.15,
      discount: 0,
      ivaRate: defaultIvaRate(),
    });
  }

  return buildInvoicePreviewPayload(db, {
    branch,
    buyer: buyerFromCustomer(payment.appointment.customer),
    lines,
  });
}

export async function previewInvoiceFromProductSale(
  db: Db,
  productSaleId: number,
): Promise<InvoicePreviewData> {
  const sale = await db.productSale.findUnique({
    where: { id: productSaleId },
    include: {
      electronicDocument: true,
      customer: true,
      branch: true,
      lines: { include: { product: true } },
    },
  });
  if (!sale) throw new Error("Venta no encontrada");
  if (sale.electronicDocument) throw new Error("Esta venta ya tiene factura");

  const lines = sale.lines.map((row) =>
    lineFromProduct(row.product, row.quantity),
  );
  const buyer = sale.customer
    ? buyerFromCustomer(sale.customer)
    : buyerFromCustomer({
        name: "Consumidor",
        lastnames: "Final",
        identificationType: "07",
        identification: "9999999999999",
        address: "S/N",
        email: "",
        phone: "",
      });

  return buildInvoicePreviewPayload(db, {
    branch: sale.branch,
    buyer,
    lines,
  });
}

async function applySriAuthResult(
  db: Db,
  documentId: number,
  result: SriAuthResult,
) {
  const dbStatus =
    result.status === "authorized"
      ? "authorized"
      : result.status === "received"
        ? "received"
        : "rejected";

  return db.electronicDocument.update({
    where: { id: documentId },
    data: {
      status: dbStatus,
      authorizationNumber: result.authorizationNumber,
      authorizationDate: result.authorizationDate,
      sriMessages: result.messages,
    },
    include: { branch: { select: { name: true } } },
  });
}

export async function refreshElectronicDocumentAuthorization(db: Db, documentId: number) {
  const doc = await db.electronicDocument.findUnique({
    where: { id: documentId },
    include: { branch: { select: { name: true } } },
  });
  if (!doc) throw new Error("Comprobante no encontrado");
  if (doc.status === "authorized") return doc;

  const result = await queryInvoiceAuthorization({
    accessKey: doc.accessKey,
    environment: doc.environment as "pruebas" | "produccion",
  });

  return applySriAuthResult(db, doc.id, result);
}

export async function pollPendingElectronicDocumentAuthorizations(db: Db, limit = 50) {
  const pending = await db.electronicDocument.findMany({
    where: { status: "received" },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let updated = 0;
  for (const doc of pending) {
    try {
      const before = await db.electronicDocument.findUnique({
        where: { id: doc.id },
        select: { status: true },
      });
      await refreshElectronicDocumentAuthorization(db, doc.id);
      const after = await db.electronicDocument.findUnique({
        where: { id: doc.id },
        select: { status: true },
      });
      if (before?.status !== after?.status) updated += 1;
    } catch (error) {
      console.error(`SRI poll failed for document ${doc.id}`, error);
    }
  }

  return { checked: pending.length, updated };
}

export async function issueElectronicDocument(db: Db, documentId: number) {
  const doc = await db.electronicDocument.findUnique({
    where: { id: documentId },
    include: { branch: { select: { name: true } } },
  });
  if (!doc) throw new Error("Comprobante no encontrado");
  if (doc.status === "authorized") return doc;
  if (doc.status === "received") {
    return refreshElectronicDocumentAuthorization(db, documentId);
  }

  const sri = await db.sriSettings.findUnique({ where: { id: 1 } });
  if (!sri?.certStoragePath || !sri.certPasswordEnc) {
    throw new Error("Sube el certificado .p12 en Configuración SRI");
  }

  const xmlUnsigned = doc.xmlUnsigned;
  if (!xmlUnsigned) throw new Error("El comprobante no tiene XML generado");

  const signedXml = await signInvoiceXml({
    xml: xmlUnsigned,
    certStoragePath: sri.certStoragePath,
    certPasswordEnc: sri.certPasswordEnc,
  });

  await db.electronicDocument.update({
    where: { id: doc.id },
    data: { xmlSigned: signedXml, status: "signed" },
  });

  const result = await sendInvoiceToSri({
    signedXml,
    accessKey: doc.accessKey,
    environment: doc.environment as "pruebas" | "produccion",
  });

  return applySriAuthResult(db, doc.id, result);
}

export async function listElectronicDocuments(
  db: Db,
  filters?: { status?: string; limit?: number },
) {
  const docs = await db.electronicDocument.findMany({
    where: filters?.status ? { status: filters.status as never } : undefined,
    orderBy: { issueDate: "desc" },
    take: filters?.limit ?? 100,
    include: { branch: { select: { name: true } } },
  });
  return docs.map(serializeDocument);
}

export async function getElectronicDocument(db: Db, id: number) {
  const doc = await db.electronicDocument.findUnique({
    where: { id },
    include: { branch: { select: { name: true } } },
  });
  if (!doc) return null;
  return {
    ...serializeDocument(doc),
    lines: doc.lines,
    subtotal: doc.subtotal,
    ivaAmount: doc.ivaAmount,
    buyerAddress: doc.buyerAddress,
    buyerEmail: doc.buyerEmail,
    buyerPhone: doc.buyerPhone,
    authorizationDate: doc.authorizationDate?.toISOString() ?? null,
    sriMessages: doc.sriMessages,
    xmlUnsigned: doc.xmlUnsigned,
    xmlSigned: doc.xmlSigned,
  };
}

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { toAmount } from "@/shared/utils/money";
import {
  buildAccessKey,
  formatSeries,
  randomNumericCode,
} from "../lib/access-key";
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
import type {
  ElectronicDocumentSummary,
  InvoiceLine,
  InvoicePreviewData,
  PendingSale,
  PendingSalesPage,
} from "../types";

type Db = PrismaClient;

type InvoicePayload = {
  xmlUnsigned?: string;
  xmlSigned?: string;
  sriMessages?: unknown;
  appointmentPaymentId?: number;
  sourceType?: "appointment" | "product_sale";
};

type CustomerRow = {
  id?: number;
  name: string;
  firstLastName?: string | null;
  secondLastName?: string | null;
  identType?: string | null;
  cedula?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
};

function normalizeRuc(value: string) {
  return value.replace(/\D/g, "").slice(0, 13);
}

function payloadOf(value: unknown): InvoicePayload {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as InvoicePayload;
  }
  return {};
}

function lastNames(customer: CustomerRow) {
  return [customer.firstLastName, customer.secondLastName]
    .filter(Boolean)
    .join(" ");
}

function buyerFromCustomer(customer: CustomerRow) {
  const identification = customer.cedula?.trim();
  const name = `${customer.name} ${lastNames(customer)}`.trim();
  if (identification) {
    return {
      name,
      identification,
      identificationType: customer.identType ?? "05",
      address: customer.address ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
    };
  }
  return {
    name: "CONSUMIDOR FINAL",
    identification: "9999999999999",
    identificationType: "07",
    address: customer.address || "S/N",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
  };
}

function lineFromService(service: {
  id: number;
  name: string;
  price: number;
}): InvoiceLine {
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
  estab: string,
  ptoEmi: string,
  fallback: number,
) {
  const last = await db.electronicInvoice.findFirst({
    where: { establishmentCode: estab, emissionPointCode: ptoEmi },
    orderBy: { id: "desc" },
    select: { sequential: true },
  });
  const fromLast = last?.sequential ? Number(last.sequential) + 1 : 0;
  return String(Math.max(fromLast, fallback, 1)).padStart(9, "0");
}

async function getIssuerContext(db: Db) {
  const [app, sri] = await Promise.all([
    db.appSettings.findUnique({ where: { id: 1 } }),
    db.sriBillingSettings.findUnique({ where: { id: 1 } }),
  ]);
  const ruc = normalizeRuc(sri?.ruc ?? "");
  if (!ruc || ruc.length !== 13) {
    throw new Error(
      "Configura el RUC del negocio en Sistema → Configuración SRI",
    );
  }
  const legalName = sri?.legalName?.trim() || app?.name || "Peluquería y Spa";
  return {
    app,
    sri,
    issuer: {
      ruc,
      name: legalName,
      tradeName: sri?.tradeName?.trim() || legalName,
      address:
        sri?.matrixAddress?.trim() || sri?.establishmentAddress?.trim() || "",
      obligationAccounting: sri?.accountingRequired ?? true,
    },
    environment: (sri?.environment === "produccion"
      ? "produccion"
      : "pruebas") as "pruebas" | "produccion",
  };
}

export function serializeDocument(doc: {
  id: number;
  documentType: string | null;
  status: string;
  accessKey: string | null;
  establishmentCode: string | null;
  emissionPointCode: string | null;
  sequential: string | null;
  createdAt: Date;
  buyerName: string | null;
  buyerIdentification: string | null;
  total: number;
  environment: string;
  authorizationNumber: string | null;
  branch?: { name: string } | null;
  orderId: number | null;
  payloadJson?: unknown;
}): ElectronicDocumentSummary {
  const payload = payloadOf(doc.payloadJson);
  const estab = doc.establishmentCode || "001";
  const pto = doc.emissionPointCode || "001";
  const sequential = String(doc.sequential || "1").padStart(9, "0");
  return {
    id: doc.id,
    type: doc.documentType || "factura",
    status: doc.status,
    accessKey: doc.accessKey ?? "",
    series: formatSeries(estab, pto, sequential),
    issueDate: doc.createdAt.toISOString(),
    buyerName: doc.buyerName ?? "",
    buyerIdentification: doc.buyerIdentification ?? "",
    total: doc.total,
    environment: doc.environment,
    authorizationNumber: doc.authorizationNumber,
    branchName: doc.branch?.name ?? null,
    sourceType:
      payload.sourceType === "appointment" || payload.appointmentPaymentId
        ? "appointment"
        : doc.orderId
          ? "product_sale"
          : null,
    sourceId: doc.orderId ?? payload.appointmentPaymentId ?? null,
  };
}

export async function listPendingSales(
  db: Db,
  options: { page?: number; pageSize?: number } = {},
): Promise<PendingSalesPage> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));

  const [payments, sales, invoices] = await Promise.all([
    db.appointmentPayment.findMany({
      select: { id: true, appointmentId: true, paidAt: true },
      orderBy: { paidAt: "desc" },
    }),
    db.sale.findMany({
      where: { electronicInvoices: { none: {} } },
      select: { id: true, paidAt: true, date: true },
      orderBy: { date: "desc" },
    }),
    db.electronicInvoice.findMany({
      select: { payloadJson: true },
      take: 2000,
      orderBy: { id: "desc" },
    }),
  ]);

  const usedPayments = new Set(
    invoices.flatMap((inv) => {
      const id = payloadOf(inv.payloadJson).appointmentPaymentId;
      return id ? [id] : [];
    }),
  );

  const keys = [
    ...payments
      .filter((payment) => !usedPayments.has(payment.id))
      .map((payment) => ({
        kind: "appointment" as const,
        id: payment.appointmentId,
        paymentId: payment.id,
        paidAt: payment.paidAt,
      })),
    ...sales.map((sale) => ({
      kind: "product_sale" as const,
      id: sale.id,
      paymentId: undefined as number | undefined,
      paidAt: sale.paidAt ?? sale.date,
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

  const [paymentDetails, saleDetails] = await Promise.all([
    paymentIds.length
      ? db.appointmentPayment.findMany({
          where: { id: { in: paymentIds } },
          include: {
            appointment: {
              include: {
                customer: true,
                branch: { select: { name: true } },
                services: { include: { service: true } },
                products: { include: { product: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    saleIds.length
      ? db.sale.findMany({
          where: { id: { in: saleIds } },
          include: {
            customer: true,
            cashRegister: { include: { branch: { select: { name: true } } } },
            lines: { include: { product: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const paymentById = new Map(
    paymentDetails.map((payment) => {
      const apt = payment.appointment;
      const item: PendingSale = {
        kind: "appointment",
        id: apt.id,
        paymentId: payment.id,
        paidAt: payment.paidAt.toISOString(),
        amount: payment.amount,
        customerName: `${apt.customer.name} ${lastNames(apt.customer)}`.trim(),
        customerIdentification: apt.customer.cedula,
        branchName: apt.branch?.name ?? null,
        description:
          [
            ...apt.services.map((row) => row.service.name),
            ...apt.products.map((row) => row.product.name),
          ].join(", ") || apt.title,
      };
      return [payment.id, item] as const;
    }),
  );

  const saleById = new Map(
    saleDetails.map((sale) => {
      const item: PendingSale = {
        kind: "product_sale",
        id: sale.id,
        paidAt: (sale.paidAt ?? sale.date).toISOString(),
        amount: sale.lines.reduce(
          (sum, line) => sum + toAmount(line.quantity) * toAmount(line.price),
          0,
        ),
        customerName: sale.customer
          ? `${sale.customer.name} ${lastNames(sale.customer)}`.trim()
          : "Consumidor final",
        customerIdentification: sale.customer?.cedula ?? null,
        branchName: sale.cashRegister?.branch?.name ?? null,
        description: sale.lines.map((line) => line.product.name).join(", "),
      };
      return [sale.id, item] as const;
    }),
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

async function createDraftInvoice(
  db: Db,
  input: {
    branch: {
      id: number | null;
      establishmentCode?: string | null;
      emissionPointCode?: string | null;
    } | null;
    orderId: number | null;
    appointmentPaymentId: number | null;
    customerId: number | null;
    buyer: ReturnType<typeof buyerFromCustomer>;
    lines: InvoiceLine[];
  },
) {
  const { issuer, environment, sri } = await getIssuerContext(db);
  const { estab, ptoEmi } = resolveEmissionCodes({
    establishmentCode: input.branch?.establishmentCode || sri?.establishmentCode,
    emissionPointCode: input.branch?.emissionPointCode || sri?.emissionPointCode,
  });
  const sequential = await nextSequential(
    db,
    estab,
    ptoEmi,
    sri?.nextInvoiceSequential ?? 1,
  );
  const issueDate = new Date();
  const accessKey = buildAccessKey({
    issueDate,
    docType: "01",
    ruc: issuer.ruc,
    environment: environment === "produccion" ? "2" : "1",
    estab,
    ptoEmi,
    sequential,
    numericCode: randomNumericCode(),
  });
  const totals = computeInvoiceTotals(input.lines);
  const xmlUnsigned = buildInvoiceXml({
    accessKey,
    environment: environment === "produccion" ? "2" : "1",
    issueDate,
    estab,
    ptoEmi,
    sequential,
    issuer,
    buyer: input.buyer,
    lines: input.lines,
    ...totals,
  });
  const payload: InvoicePayload = {
    xmlUnsigned,
    appointmentPaymentId: input.appointmentPaymentId ?? undefined,
    sourceType: input.appointmentPaymentId ? "appointment" : "product_sale",
  };

  const doc = await db.electronicInvoice.create({
    data: {
      environment,
      documentType: "factura",
      establishmentCode: estab,
      emissionPointCode: ptoEmi,
      sequential,
      accessKey,
      status: "draft",
      customerId: input.customerId,
      orderId: input.orderId,
      branchId: input.branch?.id ?? null,
      buyerName: input.buyer.name,
      buyerIdentification: input.buyer.identification,
      buyerIdentificationType: input.buyer.identificationType,
      buyerAddress: input.buyer.address,
      buyerEmail: input.buyer.email,
      buyerPhone: input.buyer.phone,
      subtotal: totals.subtotal,
      ivaAmount: totals.ivaAmount,
      total: totals.total,
      lines: input.lines as Prisma.InputJsonValue,
      payloadJson: payload as Prisma.InputJsonValue,
    },
    include: { branch: { select: { name: true } } },
  });

  await db.sriBillingSettings.update({
    where: { id: 1 },
    data: { nextInvoiceSequential: Number(sequential) + 1 },
  });

  if (sri?.enabled && sri.certificateRelativePath && sri.certificatePasswordEnc) {
    return issueElectronicDocument(db, doc.id);
  }
  return doc;
}

export async function createInvoiceFromPayment(db: Db, paymentId: number) {
  const payment = await db.appointmentPayment.findUnique({
    where: { id: paymentId },
    include: {
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

  const existing = await db.electronicInvoice.findMany({
    select: { payloadJson: true },
    take: 500,
    orderBy: { id: "desc" },
  });
  if (
    existing.some(
      (row) => payloadOf(row.payloadJson).appointmentPaymentId === payment.id,
    )
  ) {
    throw new Error("Este pago ya tiene factura");
  }

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
    branch: payment.appointment.branch,
    orderId: null,
    appointmentPaymentId: payment.id,
    customerId: payment.appointment.customerId,
    buyer: buyerFromCustomer(payment.appointment.customer),
    lines,
  });
}

export async function createInvoiceFromProductSale(db: Db, saleId: number) {
  const sale = await db.sale.findUnique({
    where: { id: saleId },
    include: {
      electronicInvoices: { select: { id: true } },
      customer: true,
      cashRegister: { include: { branch: true } },
      lines: { include: { product: true } },
    },
  });
  if (!sale) throw new Error("Venta no encontrada");
  if (sale.electronicInvoices.length > 0) {
    throw new Error("Esta venta ya tiene factura");
  }

  const lines = sale.lines.map((row) =>
    lineFromProduct(
      { id: row.product.id, name: row.product.name, price: row.price },
      row.quantity,
    ),
  );

  return createDraftInvoice(db, {
    branch: sale.cashRegister?.branch ?? null,
    orderId: sale.id,
    appointmentPaymentId: null,
    customerId: sale.customerId,
    buyer: sale.customer
      ? buyerFromCustomer(sale.customer)
      : buyerFromCustomer({
          name: "Consumidor",
          firstLastName: "Final",
          identType: "07",
          cedula: "9999999999999",
          address: "S/N",
          email: "",
          phone: "",
        }),
    lines,
  });
}

async function buildInvoicePreviewPayload(
  db: Db,
  input: {
    branch: {
      establishmentCode?: string | null;
      emissionPointCode?: string | null;
      name?: string | null;
    } | null;
    buyer: ReturnType<typeof buyerFromCustomer>;
    lines: InvoiceLine[];
  },
): Promise<InvoicePreviewData> {
  const { app, issuer, environment, sri } = await getIssuerContext(db);
  const { estab, ptoEmi } = resolveEmissionCodes({
    establishmentCode: input.branch?.establishmentCode || sri?.establishmentCode,
    emissionPointCode: input.branch?.emissionPointCode || sri?.emissionPointCode,
  });
  const sequential = await nextSequential(
    db,
    estab,
    ptoEmi,
    sri?.nextInvoiceSequential ?? 1,
  );
  const totals = computeInvoiceTotals(input.lines);

  return {
    issuer: {
      name: issuer.name,
      tradeName: issuer.tradeName,
      ruc: issuer.ruc,
      address: issuer.address,
      obligationAccounting: issuer.obligationAccounting,
      logoPath: app?.logoPath ?? null,
    },
    buyer: {
      name: input.buyer.name,
      identification: input.buyer.identification,
      address: input.buyer.address,
      email: input.buyer.email,
      phone: input.buyer.phone,
    },
    series: formatSeries(estab, ptoEmi, sequential),
    environment,
    branchName: input.branch?.name ?? null,
    lines: input.lines,
    ...totals,
    issueDate: new Date().toISOString(),
  };
}

export async function previewInvoiceFromPayment(db: Db, paymentId: number) {
  const payment = await db.appointmentPayment.findUnique({
    where: { id: paymentId },
    include: {
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
    branch: payment.appointment.branch,
    buyer: buyerFromCustomer(payment.appointment.customer),
    lines,
  });
}

export async function previewInvoiceFromProductSale(db: Db, saleId: number) {
  const sale = await db.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      cashRegister: { include: { branch: true } },
      lines: { include: { product: true } },
    },
  });
  if (!sale) throw new Error("Venta no encontrada");

  const lines = sale.lines.map((row) =>
    lineFromProduct(
      { id: row.product.id, name: row.product.name, price: row.price },
      row.quantity,
    ),
  );

  return buildInvoicePreviewPayload(db, {
    branch: sale.cashRegister?.branch ?? null,
    buyer: sale.customer
      ? buyerFromCustomer(sale.customer)
      : buyerFromCustomer({
          name: "Consumidor",
          firstLastName: "Final",
          identType: "07",
          cedula: "9999999999999",
          address: "S/N",
          email: "",
          phone: "",
        }),
    lines,
  });
}

async function applySriAuthResult(
  db: Db,
  documentId: number,
  result: SriAuthResult,
) {
  const status =
    result.status === "authorized"
      ? "authorized"
      : result.status === "received"
        ? "received"
        : "rejected";
  const current = await db.electronicInvoice.findUnique({
    where: { id: documentId },
    select: { payloadJson: true },
  });
  const payload = {
    ...payloadOf(current?.payloadJson),
    sriMessages: result.messages,
  };

  return db.electronicInvoice.update({
    where: { id: documentId },
    data: {
      status,
      authorizationNumber: result.authorizationNumber,
      authorizationDate: result.authorizationDate,
      payloadJson: payload as Prisma.InputJsonValue,
    },
    include: { branch: { select: { name: true } } },
  });
}

export async function refreshElectronicDocumentAuthorization(
  db: Db,
  documentId: number,
) {
  const doc = await db.electronicInvoice.findUnique({
    where: { id: documentId },
    include: { branch: { select: { name: true } } },
  });
  if (!doc) throw new Error("Comprobante no encontrado");
  if (doc.status === "authorized") return doc;
  if (!doc.accessKey) throw new Error("El comprobante no tiene clave de acceso");

  const result = await queryInvoiceAuthorization({
    accessKey: doc.accessKey,
    environment: doc.environment as "pruebas" | "produccion",
  });
  return applySriAuthResult(db, doc.id, result);
}

export async function pollPendingElectronicDocumentAuthorizations(
  db: Db,
  limit = 50,
) {
  const pending = await db.electronicInvoice.findMany({
    where: { status: "received" },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let updated = 0;
  for (const doc of pending) {
    try {
      const before = await db.electronicInvoice.findUnique({
        where: { id: doc.id },
        select: { status: true },
      });
      await refreshElectronicDocumentAuthorization(db, doc.id);
      const after = await db.electronicInvoice.findUnique({
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
  const doc = await db.electronicInvoice.findUnique({
    where: { id: documentId },
    include: { branch: { select: { name: true } } },
  });
  if (!doc) throw new Error("Comprobante no encontrado");
  if (doc.status === "authorized") return doc;
  if (doc.status === "received") {
    return refreshElectronicDocumentAuthorization(db, documentId);
  }
  if (!doc.accessKey) throw new Error("El comprobante no tiene clave de acceso");

  const sri = await db.sriBillingSettings.findUnique({ where: { id: 1 } });
  if (!sri?.certificateRelativePath || !sri.certificatePasswordEnc) {
    throw new Error("Sube el certificado .p12 en Configuración SRI");
  }

  const payload = payloadOf(doc.payloadJson);
  if (!payload.xmlUnsigned) {
    throw new Error("El comprobante no tiene XML generado");
  }

  const signedXml = await signInvoiceXml({
    xml: payload.xmlUnsigned,
    certStoragePath: sri.certificateRelativePath,
    certPasswordEnc: sri.certificatePasswordEnc,
  });

  await db.electronicInvoice.update({
    where: { id: doc.id },
    data: {
      status: "signed",
      payloadJson: {
        ...payload,
        xmlSigned: signedXml,
      } as Prisma.InputJsonValue,
    },
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
  const docs = await db.electronicInvoice.findMany({
    where: filters?.status ? { status: filters.status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 100,
    include: { branch: { select: { name: true } } },
  });
  return docs.map(serializeDocument);
}

export async function getElectronicDocument(db: Db, id: number) {
  const doc = await db.electronicInvoice.findUnique({
    where: { id },
    include: { branch: { select: { name: true } } },
  });
  if (!doc) return null;
  const payload = payloadOf(doc.payloadJson);
  return {
    ...serializeDocument(doc),
    lines: doc.lines,
    subtotal: doc.subtotal,
    ivaAmount: doc.ivaAmount,
    buyerAddress: doc.buyerAddress,
    buyerEmail: doc.buyerEmail,
    buyerPhone: doc.buyerPhone,
    authorizationDate: doc.authorizationDate?.toISOString() ?? null,
    sriMessages: payload.sriMessages ?? [],
    xmlUnsigned: payload.xmlUnsigned ?? null,
    xmlSigned: payload.xmlSigned ?? null,
  };
}

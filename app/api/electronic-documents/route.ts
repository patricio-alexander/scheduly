import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import {
  createInvoiceFromPayment,
  createInvoiceFromProductSale,
  listElectronicDocuments,
} from "@/src/features/electronic-docs/services/invoice-service";

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const documents = await listElectronicDocuments(prisma, { status });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("GET /api/electronic-documents", error);
    return NextResponse.json(
      { message: "Error al listar comprobantes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      paymentId?: number;
      productSaleId?: number;
      issue?: boolean;
    };

    let doc;
    if (body.paymentId) {
      doc = await createInvoiceFromPayment(prisma, Number(body.paymentId));
    } else if (body.productSaleId) {
      doc = await createInvoiceFromProductSale(prisma, Number(body.productSaleId));
    } else {
      return NextResponse.json(
        { message: "Indica paymentId o productSaleId" },
        { status: 400 },
      );
    }

    if (doc.status === "draft") {
      const { issueElectronicDocument } = await import(
        "@/src/features/electronic-docs/services/invoice-service"
      );
      doc = await issueElectronicDocument(prisma, doc.id);
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("POST /api/electronic-documents", error);
    const message =
      error instanceof Error ? error.message : "Error al crear comprobante";
    return NextResponse.json({ message }, { status: 400 });
  }
}

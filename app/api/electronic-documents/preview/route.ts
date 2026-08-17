import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import {
  previewInvoiceFromPayment,
  previewInvoiceFromProductSale,
} from "@/src/features/electronic-docs/services/invoice-service";

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
    };

    let preview;
    if (body.paymentId) {
      preview = await previewInvoiceFromPayment(prisma, Number(body.paymentId));
    } else if (body.productSaleId) {
      preview = await previewInvoiceFromProductSale(
        prisma,
        Number(body.productSaleId),
      );
    } else {
      return NextResponse.json(
        { message: "Indica paymentId o productSaleId" },
        { status: 400 },
      );
    }

    return NextResponse.json(preview);
  } catch (error) {
    console.error("POST /api/electronic-documents/preview", error);
    const message =
      error instanceof Error ? error.message : "Error al previsualizar factura";
    return NextResponse.json({ message }, { status: 400 });
  }
}

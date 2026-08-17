import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import { issueElectronicDocument } from "@/src/features/electronic-docs/services/invoice-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const doc = await issueElectronicDocument(prisma, Number(id));
    return NextResponse.json(doc);
  } catch (error) {
    console.error("POST /api/electronic-documents/[id]/issue", error);
    const message =
      error instanceof Error ? error.message : "Error al emitir comprobante";
    return NextResponse.json({ message }, { status: 400 });
  }
}

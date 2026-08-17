import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import { getElectronicDocument } from "@/src/features/electronic-docs/services/invoice-service";

export async function GET(
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
    const doc = await getElectronicDocument(prisma, Number(id));
    if (!doc) {
      return NextResponse.json({ message: "Comprobante no encontrado" }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (error) {
    console.error("GET /api/electronic-documents/[id]", error);
    return NextResponse.json(
      { message: "Error al obtener comprobante" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { getBusinessSettings } from "@/shared/utils/business-settings";

/** Catálogo público de productos (si la dueña lo tiene activo). */
export async function GET() {
  try {
    const settings = await getBusinessSettings();
    const enabled = settings.operationFlags?.showPublicCatalog !== false;

    if (!enabled) {
      return NextResponse.json(
        {
          enabled: false,
          products: [],
          message: "El catálogo público está desactivado por el local",
        },
        { status: 200 },
      );
    }

    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      take: 80,
      select: {
        id: true,
        name: true,
        desc: true,
        price: true,
        primaryImageUrl: true,
        sku: true,
        category: { select: { id: true, name: true } },
        unit: { select: { abbreviation: true, name: true } },
      },
    });

    return NextResponse.json({
      enabled: true,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.desc,
        price: p.price,
        imageUrl: p.primaryImageUrl,
        sku: p.sku,
        category: p.category?.name ?? null,
        unit: p.unit?.abbreviation || p.unit?.name || null,
      })),
    });
  } catch (error) {
    console.error("GET /api/public/catalogo", error);
    return NextResponse.json(
      { message: "Error al cargar el catálogo" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

function parseCategoryId(value: unknown): number | null {
  if (value == null || value === "" || value === "none") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: "desc" },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products", error);
    return NextResponse.json(
      { message: "Error al obtener productos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = await prisma.product.create({
      data: {
        name: String(body.name ?? ""),
        price: Number(body.price ?? 0),
        stock: Number(body.stock ?? 0),
        categoryId: parseCategoryId(body.categoryId),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products", error);
    return NextResponse.json(
      { message: "Error al crear el producto" },
      { status: 500 },
    );
  }
}

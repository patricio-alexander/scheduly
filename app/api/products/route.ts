import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products", error);
    return NextResponse.json(
      { message: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = await prisma.product.create({ data: body });
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error al crear el producto" },
      { status: 500 }
    );
  }
}

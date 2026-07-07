import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json(customers);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customer = await prisma.customer.create({ data: body });
    return NextResponse.json(customer, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error al crear el cliente" },
      { status: 500 }
    );
  }
}

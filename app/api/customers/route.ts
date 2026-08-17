import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { emitCustomerCreated } from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const customers = await prisma.customer.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        lastnames: true,
        phone: true,
        email: true,
        password: true,
        identificationType: true,
        identification: true,
        address: true,
      },
    });
    return NextResponse.json(
      customers.map(({ password, ...c }) => ({
        ...c,
        hasPortalAccess: Boolean(password),
      })),
    );
  } catch {
    return NextResponse.json(
      { message: "Error al obtener clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const customer = await prisma.customer.create({ data: body });
    emitCustomerCreated(customer);
    return NextResponse.json(customer, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error al crear el cliente" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { emitCustomerCreated } from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

function displayName(c: {
  name: string;
  firstName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
}) {
  if (c.name?.trim()) return c.name.trim();
  return [c.firstName, c.firstLastName, c.secondLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const customers = await prisma.customer.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        firstName: true,
        firstLastName: true,
        secondLastName: true,
        phone: true,
        email: true,
        address: true,
        identType: true,
        cedula: true,
      },
    });
    return NextResponse.json(
      customers.map((c) => ({
        id: c.id,
        name: displayName(c),
        lastnames: [c.firstLastName, c.secondLastName].filter(Boolean).join(" "),
        phone: c.phone ?? "",
        email: c.email ?? "",
        address: c.address ?? "",
        identificationType: c.identType,
        identification: c.cedula,
        hasPortalAccess: false,
      })),
    );
  } catch (error) {
    console.error("GET /api/customers", error);
    return NextResponse.json(
      { message: "Error al obtener clientes" },
      { status: 500 },
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
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }
    const customer = await prisma.customer.create({
      data: {
        name,
        firstName: String(body.firstName ?? name).trim() || name,
        firstLastName: String(body.lastnames ?? body.firstLastName ?? "").trim() || null,
        phone: String(body.phone ?? "").trim() || null,
        email: String(body.email ?? "").trim() || null,
        address: String(body.address ?? "").trim() || null,
        identType: String(body.identificationType ?? "05").slice(0, 2),
        cedula: String(body.identification ?? body.cedula ?? "").trim() || null,
      },
    });
    emitCustomerCreated(customer);
    return NextResponse.json(
      {
        id: customer.id,
        name: customer.name,
        lastnames: customer.firstLastName ?? "",
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        address: customer.address ?? "",
        identificationType: customer.identType,
        identification: customer.cedula,
        hasPortalAccess: false,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/customers", error);
    return NextResponse.json(
      { message: "Error al crear el cliente" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  emitCustomerDeleted,
  emitCustomerUpdated,
} from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isManagementRole,
  isPureEmployeeRole,
} from "@/shared/utils/roles";

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

function serializeCustomer(c: {
  id: number;
  name: string;
  firstName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  identType: string | null;
  cedula: string | null;
  isActive: boolean;
}) {
  return {
    id: c.id,
    name: displayName(c),
    firstName: c.firstName,
    lastnames: [c.firstLastName, c.secondLastName].filter(Boolean).join(" "),
    firstLastName: c.firstLastName,
    secondLastName: c.secondLastName,
    phone: c.phone ?? "",
    email: c.email ?? "",
    address: c.address ?? "",
    identificationType: c.identType,
    identification: c.cedula,
    isActive: c.isActive,
    hasPortalAccess: false,
  };
}

const customerSelect = {
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
  isActive: true,
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      select: customerSelect,
    });
    if (!customer) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json(serializeCustomer(customer));
  } catch (error) {
    console.error("GET /api/customers/[id]", error);
    return NextResponse.json(
      { message: "Error al obtener el cliente" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role) && !isPureEmployeeRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name =
      body.name != null ? String(body.name).trim() : undefined;
    if (name !== undefined && !name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }

    const customer = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined
          ? {
              name,
              firstName:
                body.firstName != null
                  ? String(body.firstName).trim() || name
                  : name,
            }
          : {}),
        ...(body.firstLastName != null || body.lastnames != null
          ? {
              firstLastName:
                String(body.firstLastName ?? body.lastnames ?? "").trim() ||
                null,
            }
          : {}),
        ...(body.phone != null
          ? { phone: String(body.phone).trim() || null }
          : {}),
        ...(body.email != null
          ? { email: String(body.email).trim() || null }
          : {}),
        ...(body.address != null
          ? { address: String(body.address).trim() || null }
          : {}),
        ...(body.identificationType != null
          ? { identType: String(body.identificationType).slice(0, 2) }
          : {}),
        ...(body.identification != null || body.cedula != null
          ? {
              cedula:
                String(body.identification ?? body.cedula ?? "").trim() || null,
            }
          : {}),
        ...(typeof body.isActive === "boolean"
          ? { isActive: body.isActive }
          : {}),
      },
      select: customerSelect,
    });
    const payload = serializeCustomer(customer);
    emitCustomerUpdated(payload);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("PUT /api/customers/[id]", error);
    return NextResponse.json(
      { message: "Error al actualizar el cliente" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const customerId = Number(id);
    await prisma.customer.delete({ where: { id: customerId } });
    emitCustomerDeleted(customerId);
    return NextResponse.json({ message: "Cliente eliminado" });
  } catch (error) {
    console.error("DELETE /api/customers/[id]", error);
    return NextResponse.json(
      { message: "Error al eliminar el cliente" },
      { status: 500 },
    );
  }
}

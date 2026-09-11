import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { hashPassword, isBcryptHash, verifyPassword } from "@/shared/utils/password";
import {
  buildCustomerAuthCookie,
  serializeCustomerSession,
} from "@/shared/utils/check-customer-auth";
import { findPortalCustomerByIdentifier } from "@/shared/utils/portal-customer-lookup";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const rawId = String(body.email ?? body.identifier ?? body.cedula ?? "")
      .trim();
    const password = String(body.password ?? "");

    if (!rawId || !password) {
      return NextResponse.json(
        { message: "Correo/cédula y contraseña requeridos" },
        { status: 400 },
      );
    }

    const looked = await findPortalCustomerByIdentifier(prisma, rawId);
    if (looked.error === "portal_login_disabled") {
      return NextResponse.json(
        { message: "El local no tiene habilitada la verificación del portal" },
        { status: 403 },
      );
    }

    const customer = looked.customer;
    if (!customer?.password || !(await verifyPassword(password, customer.password))) {
      return NextResponse.json(
        { message: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    if (!isBcryptHash(customer.password)) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { password: await hashPassword(password) },
      });
    }

    const session = await serializeCustomerSession(customer.id);
    if (!session) {
      return NextResponse.json(
        { message: "Cuenta no disponible" },
        { status: 403 },
      );
    }

    const response = NextResponse.json(session);
    response.cookies.set(buildCustomerAuthCookie(customer.id));
    return response;
  } catch {
    return NextResponse.json(
      { message: "Error al iniciar sesión" },
      { status: 500 },
    );
  }
}

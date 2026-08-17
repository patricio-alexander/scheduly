import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import {
  clearSriCertificate,
  getSriStatus,
  saveSriCertificate,
  updateSriAutoEmit,
  updateSriEnvironment,
} from "@/shared/utils/sri-settings";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const status = await getSriStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/sri", error);
    return NextResponse.json(
      { message: "Error al obtener configuración SRI" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const remove = String(form.get("remove") ?? "") === "1";
      if (remove) {
        const status = await clearSriCertificate();
        return NextResponse.json(status);
      }

      const certificate = form.get("certificate");
      const password = String(form.get("password") ?? "");
      const environment = form.get("environment");

      if (!(certificate instanceof File) || certificate.size === 0) {
        // Solo ambiente, sin nuevo archivo
        if (form.has("environment") && !password) {
          const status = await updateSriEnvironment(environment);
          return NextResponse.json(status);
        }
        return NextResponse.json(
          { message: "Selecciona el archivo .p12 del certificado" },
          { status: 400 },
        );
      }

      const status = await saveSriCertificate({
        file: certificate,
        password,
        environment,
      });
      return NextResponse.json(status);
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (body.remove) {
      return NextResponse.json(await clearSriCertificate());
    }
    if (body.autoEmitOnPayment !== undefined) {
      return NextResponse.json(
        await updateSriAutoEmit(Boolean(body.autoEmitOnPayment)),
      );
    }
    if (body.environment !== undefined) {
      return NextResponse.json(await updateSriEnvironment(body.environment));
    }
    return NextResponse.json(
      { message: "Usa multipart para subir el certificado .p12" },
      { status: 400 },
    );
  } catch (error) {
    console.error("PUT /api/sri", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error al guardar configuración SRI";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const status = await clearSriCertificate();
    return NextResponse.json(status);
  } catch (error) {
    console.error("DELETE /api/sri", error);
    return NextResponse.json(
      { message: "Error al eliminar el certificado" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import {
  clearBusinessLogo,
  getBusinessSettings,
  saveBusinessLogo,
  updateBusinessSettings,
} from "@/shared/utils/business-settings";
import { normalizeThemeColors } from "@/shared/utils/business-profile";
import { emitThemeColorsUpdated } from "@/shared/utils/socket";

/** Perfil público del negocio (landing, reserva, ticket, tema) */
export async function GET() {
  try {
    const settings = await getBusinessSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings", error);
    return NextResponse.json(
      { message: "Error al obtener la configuración" },
      { status: 500 },
    );
  }
}

/** Actualizar datos del negocio (solo admin) */
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
      const removeLogo = String(form.get("removeLogo") ?? "") === "1";
      const logo = form.get("logo");

      let settings = await getBusinessSettings();

      const businessName = form.has("businessName")
        ? String(form.get("businessName") ?? "")
        : settings.businessName;
      const address = form.has("address")
        ? String(form.get("address") ?? "")
        : settings.address;

      settings = await updateBusinessSettings({
        businessName,
        address,
        ruc: form.has("ruc") ? String(form.get("ruc") ?? "") : settings.ruc,
        tradeName: form.has("tradeName")
          ? String(form.get("tradeName") ?? "")
          : settings.tradeName,
        obligationAccounting: form.has("obligationAccounting")
          ? String(form.get("obligationAccounting") ?? "") === "1"
          : settings.obligationAccounting,
        accentColor: form.has("accentColor")
          ? String(form.get("accentColor") ?? "")
          : settings.accentColor,
        successColor: form.has("successColor")
          ? String(form.get("successColor") ?? "")
          : settings.successColor,
        warningColor: form.has("warningColor")
          ? String(form.get("warningColor") ?? "")
          : settings.warningColor,
        dangerColor: form.has("dangerColor")
          ? String(form.get("dangerColor") ?? "")
          : settings.dangerColor,
      });

      if (removeLogo) {
        settings = await clearBusinessLogo();
      } else if (logo instanceof File && logo.size > 0) {
        settings = await saveBusinessLogo(logo);
      }

      emitThemeColorsUpdated(normalizeThemeColors(settings));
      return NextResponse.json(settings);
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const current = await getBusinessSettings();
    const settings = await updateBusinessSettings({
      businessName: String(body.businessName ?? current.businessName),
      address: String(body.address ?? current.address),
      ruc: body.ruc !== undefined ? String(body.ruc) : current.ruc,
      tradeName:
        body.tradeName !== undefined ? String(body.tradeName) : current.tradeName,
      obligationAccounting:
        body.obligationAccounting !== undefined
          ? Boolean(body.obligationAccounting)
          : current.obligationAccounting,
      accentColor:
        body.accentColor !== undefined
          ? String(body.accentColor)
          : current.accentColor,
      successColor:
        body.successColor !== undefined
          ? String(body.successColor)
          : current.successColor,
      warningColor:
        body.warningColor !== undefined
          ? String(body.warningColor)
          : current.warningColor,
      dangerColor:
        body.dangerColor !== undefined
          ? String(body.dangerColor)
          : current.dangerColor,
      operationFlags:
        body.operationFlags !== undefined
          ? (body.operationFlags as import("@/shared/utils/operation-flags").OperationFlags)
          : undefined,
      bookingStartHour:
        body.bookingStartHour !== undefined
          ? Number(body.bookingStartHour)
          : current.bookingStartHour,
      bookingEndHour:
        body.bookingEndHour !== undefined
          ? Number(body.bookingEndHour)
          : current.bookingEndHour,
      cashRegisterMode:
        body.cashRegisterMode !== undefined
          ? (String(body.cashRegisterMode) as import("@/shared/utils/cash-register-mode").CashRegisterMode)
          : current.cashRegisterMode,
      payrollWeekStartDay:
        body.payrollWeekStartDay !== undefined
          ? Number(body.payrollWeekStartDay)
          : current.payrollWeekStartDay,
      payrollAllowBranchAdmin:
        body.payrollAllowBranchAdmin !== undefined
          ? Boolean(body.payrollAllowBranchAdmin)
          : current.payrollAllowBranchAdmin,
    });
    emitThemeColorsUpdated(normalizeThemeColors(settings));
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/settings", error);
    const message =
      error instanceof Error ? error.message : "Error al guardar la configuración";
    return NextResponse.json({ message }, { status: 400 });
  }
}

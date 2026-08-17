import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import {
  getBusinessSettings,
  updateBusinessSettings,
} from "@/shared/utils/business-settings";
import {
  normalizeThemeColors,
  type ThemeColors,
} from "@/shared/utils/business-profile";
import { emitThemeColorsUpdated } from "@/shared/utils/socket";

/** Actualizar solo colores de marca (global, todas las sucursales). */
export async function PATCH(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<ThemeColors>;
    const current = await getBusinessSettings();
    const colors = normalizeThemeColors({
      accentColor: body.accentColor ?? current.accentColor,
      successColor: body.successColor ?? current.successColor,
      warningColor: body.warningColor ?? current.warningColor,
      dangerColor: body.dangerColor ?? current.dangerColor,
    });

    const settings = await updateBusinessSettings({
      businessName: current.businessName,
      address: current.address,
      ...colors,
    });
    emitThemeColorsUpdated(colors);

    return NextResponse.json({
      accentColor: settings.accentColor,
      successColor: settings.successColor,
      warningColor: settings.warningColor,
      dangerColor: settings.dangerColor,
    });
  } catch (error) {
    console.error("PATCH /api/settings/theme", error);
    const message =
      error instanceof Error ? error.message : "Error al guardar colores";
    return NextResponse.json({ message }, { status: 400 });
  }
}

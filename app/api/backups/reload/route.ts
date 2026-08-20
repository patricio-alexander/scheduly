import { NextResponse } from "next/server";
import { requireOwnerForBackups } from "@/src/features/backups/lib/require-owner";
import { reloadFromMainBackup } from "@/src/features/backups/lib/import-database";

export const maxDuration = 180;

/** Recarga la BD desde backups/backup.json (como EdDeli Recargar BD). */
export async function POST() {
  const auth = await requireOwnerForBackups();
  if (!auth.ok) return auth.response;

  try {
    const summary = await reloadFromMainBackup();
    return NextResponse.json({
      ok: true,
      message: "Base de datos restaurada desde backup.json",
      totalRows: summary.totalRows,
      counts: summary.counts,
    });
  } catch (error) {
    console.error("POST /api/backups/reload", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo recargar. Verifica que exista backup.json";
    return NextResponse.json({ message }, { status: 400 });
  }
}

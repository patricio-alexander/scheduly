import { NextResponse } from "next/server";
import { requireOwnerForBackups } from "@/src/features/backups/lib/require-owner";
import { importBackupFromJson } from "@/src/features/backups/lib/import-database";
import { analyzeBackupJson } from "@/src/features/backups/lib/eddeli-map";

export const maxDuration = 300;

/**
 * Restaura la BD desde un JSON (reemplazo total).
 * multipart campo "file" o body JSON.
 */
export async function POST(request: Request) {
  const auth = await requireOwnerForBackups();
  if (!auth.ok) return auth.response;

  try {
    let raw: string;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") ?? formData.get("backup");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { message: "Subí un archivo JSON en el campo file" },
          { status: 400 },
        );
      }
      if (
        !file.name.toLowerCase().endsWith(".json") &&
        file.type !== "application/json"
      ) {
        return NextResponse.json(
          { message: "El archivo debe ser .json" },
          { status: 400 },
        );
      }
      raw = await file.text();
    } else {
      raw = await request.text();
      if (!raw.trim()) {
        return NextResponse.json({ message: "Cuerpo vacío" }, { status: 400 });
      }
    }

    const preview = analyzeBackupJson(raw);
    const summary = await importBackupFromJson(raw);

    return NextResponse.json({
      ok: true,
      message: "Base de datos restaurada (reemplazo total, no sincroniza)",
      mode: "replace",
      sourceKind: preview.sourceKind,
      sourceTables: preview.sourceTables,
      importTables: preview.importTables,
      totalRows: summary.totalRows,
      counts: summary.counts,
    });
  } catch (error) {
    console.error("POST /api/backups/import", error);
    const message =
      error instanceof Error ? error.message : "Error al importar el backup";
    return NextResponse.json({ message }, { status: 400 });
  }
}

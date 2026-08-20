import { NextResponse } from "next/server";
import { requireOwnerForBackups } from "@/src/features/backups/lib/require-owner";
import { saveBackup } from "@/src/features/backups/lib/export-database";

export const maxDuration = 120;

/** Exporta BD a JSON, guarda copia + backup.json, y descarga. */
export async function GET() {
  const auth = await requireOwnerForBackups();
  if (!auth.ok) return auth.response;

  try {
    const result = await saveBackup({ updateMain: true });
    const content = await import("fs/promises").then((fs) =>
      fs.readFile(result.storedPath),
    );

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Backup-Total-Rows": String(result.totalRows),
        "X-Backup-Size-Bytes": String(result.sizeBytes),
      },
    });
  } catch (error) {
    console.error("GET /api/backups/export", error);
    return NextResponse.json(
      { message: "Error al exportar la base de datos" },
      { status: 500 },
    );
  }
}

/** Solo guardar en disco (sin forzar descarga). */
export async function POST() {
  const auth = await requireOwnerForBackups();
  if (!auth.ok) return auth.response;

  try {
    const result = await saveBackup({ updateMain: true });
    return NextResponse.json({
      ok: true,
      message: "Backup guardado",
      filename: result.filename,
      sizeBytes: result.sizeBytes,
      totalRows: result.totalRows,
      counts: result.counts,
    });
  } catch (error) {
    console.error("POST /api/backups/export", error);
    return NextResponse.json(
      { message: "Error al guardar el backup" },
      { status: 500 },
    );
  }
}

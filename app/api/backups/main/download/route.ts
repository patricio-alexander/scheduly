import { NextResponse } from "next/server";
import { requireOwnerForBackups } from "@/src/features/backups/lib/require-owner";
import { readBackupFile } from "@/src/features/backups/lib/export-database";

/** Descarga el backup.json fijo (sin re-volcar BD). */
export async function GET() {
  const auth = await requireOwnerForBackups();
  if (!auth.ok) return auth.response;

  try {
    const { content } = await readBackupFile("backup.json");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="backup.json"',
      },
    });
  } catch {
    return NextResponse.json(
      { message: "No existe backup.json en el servidor" },
      { status: 404 },
    );
  }
}

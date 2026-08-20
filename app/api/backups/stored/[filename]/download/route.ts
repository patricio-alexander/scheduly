import { NextResponse } from "next/server";
import { requireOwnerForBackups } from "@/src/features/backups/lib/require-owner";
import { readBackupFile } from "@/src/features/backups/lib/export-database";

type Params = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireOwnerForBackups();
  if (!auth.ok) return auth.response;

  try {
    const { filename } = await params;
    const decoded = decodeURIComponent(filename);
    const { content } = await readBackupFile(decoded);
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${decoded}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo descargar";
    return NextResponse.json({ message }, { status: 404 });
  }
}

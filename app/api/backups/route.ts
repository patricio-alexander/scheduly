import { NextResponse } from "next/server";
import { requireOwnerForBackups } from "@/src/features/backups/lib/require-owner";
import {
  getMainBackupInfo,
  listStoredBackups,
} from "@/src/features/backups/lib/export-database";

export async function GET() {
  const auth = await requireOwnerForBackups();
  if (!auth.ok) return auth.response;

  try {
    const [main, stored] = await Promise.all([
      getMainBackupInfo(),
      listStoredBackups(),
    ]);
    return NextResponse.json({ main, stored });
  } catch (error) {
    console.error("GET /api/backups", error);
    return NextResponse.json(
      { message: "Error al listar backups" },
      { status: 500 },
    );
  }
}

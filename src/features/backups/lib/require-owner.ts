import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";

/** Solo Dueño: backups JSON (Scheduly no tiene rol Programador). */
export async function requireOwnerForBackups() {
  const auth = await checkAuth();
  if (!auth.ok) return { ok: false as const, response: auth.response };
  if (!isOwnerRole(auth.user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Solo el Dueño puede gestionar backups" },
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, user: auth.user };
}

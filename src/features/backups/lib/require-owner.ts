import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole, isProgrammerRole } from "@/shared/utils/roles";

/** Dueño o Programador: backups JSON. */
export async function requireOwnerForBackups() {
  const auth = await checkAuth();
  if (!auth.ok) return { ok: false as const, response: auth.response };
  if (!isOwnerRole(auth.user.role) && !isProgrammerRole(auth.user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Solo Dueño o Programador pueden gestionar backups" },
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, user: auth.user };
}

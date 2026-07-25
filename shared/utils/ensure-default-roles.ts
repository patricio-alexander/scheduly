import { prisma } from "@/shared/utils/prisma";
import { SYSTEM_ROLES } from "@/shared/utils/system-roles";

/** Crea Admin y Empleado si aún no existen en la tabla Role */
export async function ensureDefaultRoles() {
  for (const role of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name },
    });
    if (!existing) {
      await prisma.role.create({ data: { name: role.name } });
    }
  }
}

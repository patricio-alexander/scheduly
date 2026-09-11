import { getBusinessSettings } from "@/shared/utils/business-settings";

type PortalDb = {
  customer: {
    findFirst: (args: {
      where: Record<string, unknown>;
    }) => Promise<{
      id: number;
      name: string;
      email: string | null;
      cedula: string | null;
      identType: string | null;
      password: string | null;
      isActive: boolean;
      [key: string]: unknown;
    } | null>;
  };
};

/** Resuelve cliente portal según flags de dueña (correo / cédula). */
export async function findPortalCustomerByIdentifier(
  db: PortalDb,
  rawId: string,
) {
  const settings = await getBusinessSettings();
  const flags = settings.operationFlags;
  const allowEmail = flags?.portalLoginAllowEmail !== false;
  const allowCedula = flags?.portalLoginAllowCedula !== false;

  if (!allowEmail && !allowCedula) {
    return { error: "portal_login_disabled" as const, customer: null };
  }

  const emailKey = rawId.toLowerCase();
  const or: Array<{ email?: string; cedula?: string }> = [];
  if (allowEmail) {
    or.push({ email: emailKey }, { email: rawId });
  }
  if (allowCedula) {
    or.push({ cedula: rawId });
  }

  const customer = await db.customer.findFirst({
    where: { isActive: true, OR: or },
  });

  return { error: null, customer };
}

/** Nombres de cliente / personal alineados al schema Person/Customer. */

export function customerLastnames(c: {
  firstLastName?: string | null;
  secondLastName?: string | null;
  lastnames?: string | null;
}): string {
  if (c.lastnames?.trim()) return c.lastnames.trim();
  return [c.firstLastName, c.secondLastName].filter(Boolean).join(" ").trim();
}

export function customerFullName(c: {
  name?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  lastnames?: string | null;
}): string {
  const base = (c.name ?? "").trim();
  if (base) {
    const ln = customerLastnames(c);
    // Si `name` ya trae apellidos completos, no duplicar
    if (!ln || base.toLowerCase().includes(ln.toLowerCase())) return base;
    return `${base} ${ln}`.trim();
  }
  return (
    [c.firstName, c.secondName, c.firstLastName, c.secondLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Cliente"
  );
}

export function personFullName(p: {
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  name?: string | null;
} | null | undefined): string {
  if (!p) return "—";
  if (p.name?.trim()) return p.name.trim();
  return (
    [p.firstName, p.secondName, p.firstLastName, p.secondLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "—"
  );
}

/** Select Prisma reutilizable para Customer en citas. */
export const customerAppointmentSelect = {
  id: true,
  name: true,
  firstName: true,
  secondName: true,
  firstLastName: true,
  secondLastName: true,
  phone: true,
  email: true,
} as const;

export const staffAppointmentSelect = {
  id: true,
  firstName: true,
  secondName: true,
  firstLastName: true,
  secondLastName: true,
} as const;

/** Shape legacy que aún consume la UI de agenda. */
export function serializeCustomerForAgenda(c: {
  id?: number;
  name: string;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const lastnames = customerLastnames(c);
  return {
    id: c.id,
    name: c.name || customerFullName(c),
    lastnames,
    phone: c.phone ?? null,
    email: c.email ?? null,
  };
}

export function serializeStaffAsUser(p: {
  id: number;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
}) {
  return {
    id: p.id,
    name: personFullName(p),
  };
}

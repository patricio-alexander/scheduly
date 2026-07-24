import { prisma } from "@/shared/utils/prisma";

/** Forma de evento que consume FullCalendar en la agenda */
export type AppointmentCalendarEvent = {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    description: string;
    customer: string;
    user: string;
    status: string;
  };
};

export async function getAppointmentCalendarEvent(
  id: number,
): Promise<AppointmentCalendarEvent | null> {
  const a = await prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, lastnames: true } },
      user: { select: { name: true } },
    },
  });

  if (!a) return null;

  return {
    id: String(a.id),
    title: `${a.title} - ${a.customer.name} ${a.customer.lastnames}`,
    start: a.appointmentDate.toISOString(),
    extendedProps: {
      description: a.description,
      customer: `${a.customer.name} ${a.customer.lastnames}`,
      user: a.user.name,
      status: a.status,
    },
  };
}

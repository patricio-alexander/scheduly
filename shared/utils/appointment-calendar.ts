import { prisma } from "@/shared/utils/prisma";
import {
  customerAppointmentSelect,
  customerFullName,
  personFullName,
  staffAppointmentSelect,
} from "@/shared/utils/person-name";

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
    branchId?: number | null;
    userId?: number;
  };
};

export async function getAppointmentCalendarEvent(
  id: number,
): Promise<AppointmentCalendarEvent | null> {
  const a = await prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: { select: customerAppointmentSelect },
      staff: { select: staffAppointmentSelect },
    },
  });

  if (!a) return null;

  const customerName = customerFullName(a.customer);
  const staffName = personFullName(a.staff);

  return {
    id: String(a.id),
    title: `${a.title} - ${customerName}`,
    start: a.appointmentDate.toISOString(),
    extendedProps: {
      description: a.description,
      customer: customerName,
      user: staffName,
      status: a.status,
      branchId: a.branchId,
      userId: a.userId,
    },
  };
}

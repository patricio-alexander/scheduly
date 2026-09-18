import { prisma } from "@/shared/utils/prisma";
import {
  personFullName,
  staffAppointmentSelect,
} from "@/shared/utils/person-name";

export type PortalAppointment = {
  id: number;
  title: string;
  status: string;
  appointmentDate: string;
  branchName: string | null;
  staffName: string | null;
  services: Array<{ id: number; name: string; durationMinutes: number }>;
};

const appointmentInclude = {
  services: {
    include: {
      service: {
        select: { id: true, name: true, durationMinutes: true },
      },
    },
  },
  staff: { select: staffAppointmentSelect },
  branch: { select: { id: true, name: true } },
} as const;

export async function listCustomerUpcomingAppointments(
  customerId: number,
): Promise<PortalAppointment[]> {
  const from = new Date();
  from.setDate(from.getDate() - 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      customerId,
      status: { notIn: ["cancelled"] },
      appointmentDate: { gte: from },
    },
    orderBy: { appointmentDate: "asc" },
    take: 12,
    include: appointmentInclude,
  });

  return appointments.map((appointment) => {
    const staffName = personFullName(appointment.staff);
    return {
      id: appointment.id,
      title: appointment.title,
      status: appointment.status,
      appointmentDate: appointment.appointmentDate.toISOString(),
      branchName: appointment.branch?.name ?? null,
      staffName: staffName === "—" ? null : staffName,
      services: appointment.services.map((row) => ({
        id: row.service.id,
        name: row.service.name,
        durationMinutes: row.service.durationMinutes,
      })),
    };
  });
}

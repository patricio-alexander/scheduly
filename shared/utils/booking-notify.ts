import { prisma } from "@/shared/utils/prisma";
import { appRoutes } from "@/shared/utils/app-routes";

/**
 * Notifica a administradores y empleados cuando alguien agenda
 * desde la reserva pública. Solo usar en API / servidor.
 */
export async function notifyStaffNewBooking(input: {
  appointmentId: number;
  serviceName: string;
  customerName: string;
  appointmentDate: Date;
}) {
  const when = input.appointmentDate.toLocaleString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const title = "Nueva reserva online";
  const message = `${input.customerName} agendó "${input.serviceName}" · ${when}`;
  const link = `${appRoutes.operation.agenda}?appointmentId=${input.appointmentId}`;

  const staff = await prisma.user.findMany({
    where: {
      role: { in: ["admin", "employee", "user"] },
    },
    select: { id: true },
  });

  if (staff.length === 0) return;

  await prisma.notification.createMany({
    data: staff.map((user) => ({
      userId: user.id,
      title,
      message,
      type: "info",
      link,
    })),
  });
}

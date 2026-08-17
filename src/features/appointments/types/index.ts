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

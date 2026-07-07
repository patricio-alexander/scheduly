-- Expand AppointmentStatus enum with payment workflow states
ALTER TABLE `Appointment` MODIFY `status` ENUM(
  'scheduled',
  'rescheduled',
  'paid_pending',
  'pending_payment',
  'completed',
  'cancelled'
) NOT NULL;

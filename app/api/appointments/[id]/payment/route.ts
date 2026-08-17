import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  calcAppointmentTotal,
  deductStockForAppointment,
  parsePaymentMethod,
} from "@/shared/utils/appointment-business";
import {
  calcAppointmentCommission,
  recordCommissionForPayment,
} from "@/shared/utils/commissions";
import { awardLoyaltyForPayment } from "@/shared/utils/loyalty";
import { redeemRewardForCustomer } from "@/shared/utils/loyalty-redeem";
import { calcRewardDiscountAmount } from "@/shared/utils/reward-discount";
import { getAppointmentCalendarEvent } from "@/shared/utils/appointment-calendar";
import { emitAppointmentUpdated } from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const appointmentId = Number(id);

  try {
    const body = await request.json();
    const method = parsePaymentMethod(body.method);
    const notes = String(body.notes ?? "");
    const rewardId =
      body.rewardId != null && body.rewardId !== ""
        ? Number(body.rewardId)
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          payment: true,
          services: {
            include: {
              service: { select: { id: true, price: true, commissionPct: true } },
            },
          },
          products: { include: { product: { select: { id: true, price: true } } } },
        },
      });

      if (!appointment) {
        throw new Error("Turno no encontrado");
      }

      if (appointment.payment) {
        throw new Error("Este turno ya tiene un pago registrado");
      }

      const total = calcAppointmentTotal(appointment.services, appointment.products);
      let amount =
        body.amount != null && body.amount !== ""
          ? Number(body.amount)
          : total;

      if (Number.isNaN(amount) || amount < 0) {
        throw new Error("Monto inválido");
      }

      let paymentNotes = notes;
      let rewardName: string | null = null;

      if (rewardId) {
        const reward = await tx.reward.findUnique({ where: { id: rewardId } });
        if (!reward || !reward.isActive) {
          throw new Error("Premio no disponible");
        }

        const serviceIds = appointment.services.map((s) => s.service.id);
        const productIds = appointment.products.map((p) => p.product.id);
        const appliesToService =
          reward.serviceId != null && serviceIds.includes(reward.serviceId);
        const appliesToProduct =
          reward.productId != null && productIds.includes(reward.productId);

        if (!appliesToService && !appliesToProduct) {
          throw new Error("Este premio no aplica a los ítems del turno");
        }

        const discount = calcRewardDiscountAmount(reward, appointment);

        amount = Math.max(
          0,
          Math.round((total - discount) * 100) / 100,
        );
        rewardName = reward.name;

        await redeemRewardForCustomer(tx, {
          customerId: appointment.customerId,
          rewardId,
          appointmentId,
        });

        const rewardNote =
          discount > 0
            ? `Premio canjeado: ${reward.name} (-${discount})`
            : `Premio canjeado: ${reward.name}`;
        paymentNotes = paymentNotes ? `${paymentNotes}\n${rewardNote}` : rewardNote;
      }

      const payment = await tx.payment.create({
        data: {
          appointmentId,
          amount,
          method,
          notes: paymentNotes,
        },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "completed" },
      });

      await deductStockForAppointment(tx, appointmentId);

      await awardLoyaltyForPayment(tx, {
        customerId: appointment.customerId,
        appointmentId,
        paidAmount: amount,
      });

      const commission = calcAppointmentCommission(
        appointment.services,
        appointment.products,
        amount,
      );

      await recordCommissionForPayment(tx, {
        userId: appointment.userId,
        appointmentId,
        baseAmount: commission.baseAmount,
        amount: commission.amount,
        ratePct: commission.ratePct,
      });

      return { payment, rewardName };
    });

    const calendarEvent = await getAppointmentCalendarEvent(appointmentId);
    if (calendarEvent) emitAppointmentUpdated(calendarEvent);

    try {
      const sri = await prisma.sriSettings.findUnique({ where: { id: 1 } });
      if (
        sri?.autoEmitOnPayment &&
        sri.certStoragePath &&
        sri.certPasswordEnc
      ) {
        const { createInvoiceFromPayment } = await import(
          "@/src/features/electronic-docs/services/invoice-service"
        );
        await createInvoiceFromPayment(prisma, result.payment.id);
      }
    } catch (invoiceError) {
      console.error("Auto facturación SRI", invoiceError);
    }

    return NextResponse.json(result.payment, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments/[id]/payment", error);
    const message =
      error instanceof Error ? error.message : "Error al registrar el pago";
    const status = message.includes("no encontrado") ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}

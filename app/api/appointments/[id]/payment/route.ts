import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  calcAppointmentTotal,
  deductStockForAppointment,
  parsePaymentMethod,
} from "@/shared/utils/appointment-business";
import { resolvePaymentMedium } from "@/shared/utils/payment-media";
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
import { getCashRegisterMode } from "@/shared/utils/business-settings";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { isPureEmployeeRole } from "@/shared/utils/roles";
import { recordLedgerIncome } from "@/shared/utils/finance-ledger";

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
    const resolvedMedium = await resolvePaymentMedium(prisma, {
      method: body.method != null ? String(body.method) : null,
      mediumCode:
        body.mediumCode != null
          ? String(body.mediumCode)
          : body.paymentMediumCode != null
            ? String(body.paymentMediumCode)
            : null,
      paymentMediumId:
        body.paymentMediumId != null && body.paymentMediumId !== ""
          ? Number(body.paymentMediumId)
          : null,
    });
    const method = parsePaymentMethod(resolvedMedium.method);
    const notes = String(body.notes ?? "");
    const rewardId =
      body.rewardId != null && body.rewardId !== ""
        ? Number(body.rewardId)
        : null;

    const cashMode = await getCashRegisterMode();
    const branchId =
      (await getUserPrimaryBranchId(prisma, auth.user.id)) ??
      (
        await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { branchId: true },
        })
      )?.branchId ??
      null;

    const openShiftWhere =
      cashMode === "employee_own"
        ? { status: "open" as const, accountId: auth.user.id }
        : {
            status: "open" as const,
            ...(branchId ? { storeId: branchId } : {}),
          };

    const openShift = await prisma.cashShift.findFirst({
      where: openShiftWhere,
      orderBy: { id: "desc" },
      select: { id: true, accountId: true },
    });

    if (!openShift) {
      return NextResponse.json(
        {
          message:
            cashMode === "employee_own"
              ? "Debes abrir tu turno de caja antes de cobrar"
              : "No hay turno de caja abierto en la sucursal para cobrar",
        },
        { status: 400 },
      );
    }

    if (
      cashMode === "branch_shared" &&
      isPureEmployeeRole(auth.user.role) &&
      openShift.accountId === auth.user.id
    ) {
      // ok if somehow they have shift; shared mode usually uses admin shift
    }

    const paidAtRaw = body.paidAt ? new Date(String(body.paidAt)) : new Date();
    const paidAt = Number.isNaN(paidAtRaw.getTime()) ? new Date() : paidAtRaw;

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          payment: true,
          customer: { select: { name: true } },
          services: {
            include: {
              service: { select: { id: true, price: true, commissionPct: true } },
            },
          },
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  price: true,
                  commissionPct: true,
                  category: { select: { commissionPct: true } },
                },
              },
            },
          },
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
      if (resolvedMedium.medium) {
        const tag = `[MEDIO:${resolvedMedium.medium.code || resolvedMedium.medium.id}] ${resolvedMedium.medium.name}`;
        paymentNotes = paymentNotes ? `${paymentNotes}\n${tag}` : tag;
      }

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

      const payment = await tx.appointmentPayment.create({
        data: {
          appointmentId,
          amount,
          method,
          paymentMediumId: resolvedMedium.medium?.id ?? null,
          notes: paymentNotes,
          paidAt,
        },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "completed" },
      });

      await deductStockForAppointment(tx, appointmentId, auth.user.id);

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
        createdAt: paidAt,
      });

      // Ingreso de cita en la caja abierta (arqueo / cierre)
      if (auth.user.personId && amount > 0) {
        const isCash =
          !["transfer", "transferencia", "card", "tarjeta", "credito"].includes(
            String(method).toLowerCase(),
          );
        if (isCash) {
          await tx.cashShiftMovement.create({
            data: {
              shiftId: openShift.id,
              accountId: auth.user.id,
              userId: auth.user.personId,
              direction: "in",
              category: "appointment",
              amount,
              concept: `Cobro cita #${appointmentId}`,
              notes: paymentNotes || null,
              createdAt: paidAt,
            },
          });
        }
      }

      // Ledger Finanzas (Income) — el centro solo lee esta tabla
      if (amount > 0) {
        await recordLedgerIncome(tx, {
          amount,
          date: paidAt,
          concept: `Cobro cita #${appointmentId}`,
          category: "Cita / servicio",
          createdByAccountId: auth.user.id,
          counterpartyName: appointment.customer?.name ?? null,
          referenceType: "appointment_payment",
          referenceId: payment.id,
        });
      }

      return { payment, rewardName };
    });

    const calendarEvent = await getAppointmentCalendarEvent(appointmentId);
    if (calendarEvent) emitAppointmentUpdated(calendarEvent);

    try {
      const sri = await prisma.sriBillingSettings.findUnique({
        where: { id: 1 },
      });
      if (
        sri?.enabled &&
        sri.certificateRelativePath &&
        sri.certificatePasswordEnc
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

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Label,
  Modal,
  toast,
  useOverlayState,
} from "@heroui/react";
import { AppNumberField } from "@/shared/components/AppNumberField";
import CreditCard from "@gravity-ui/icons/CreditCard";
import Wallet from "@gravity-ui/icons/Wallet";
import ArrowRightArrowLeft from "@gravity-ui/icons/ArrowRightArrowLeft";
import { SelectField } from "@/shared/components/SelectField";
import { formatMoney } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import type { DashboardPeriod } from "@/shared/utils/dashboard-period";
import { registerEmployeePayment } from "../services/payroll-service";
import type { PayrollEmployee } from "../types";

interface Props {
  employee: PayrollEmployee | null;
  branchId: number | null;
  period: DashboardPeriod;
  modal: ReturnType<typeof useOverlayState>;
  onClose: () => void;
  onSuccess: () => void;
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "accent" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "accent"
        ? "text-accent"
        : tone === "muted"
          ? "text-muted"
          : "text-foreground";

  return (
    <div className="rounded-xl border border-separator bg-surface-secondary/40 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-1 text-base font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

export function RegisterEmployeePaymentModal({
  employee,
  branchId,
  period,
  modal,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodValue>("transfer");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!employee || !modal.isOpen) return;
    setAmount(
      employee.pendingAmount > 0
        ? String(employee.pendingAmount)
        : employee.commissionTotal > 0
          ? String(employee.commissionTotal)
          : "",
    );
    setMethod("transfer");
    setNotes("");
  }, [employee, modal.isOpen]);

  const parsedAmount = useMemo(() => Number(amount), [amount]);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const exceedsPending =
    employee != null &&
    employee.pendingAmount > 0 &&
    isValidAmount &&
    parsedAmount > employee.pendingAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    if (!isValidAmount) {
      toast.danger("Ingresa un monto válido");
      return;
    }

    setPending(true);
    try {
      await registerEmployeePayment({
        userId: employee.userId,
        amount: parsedAmount,
        method,
        notes,
        branchId,
        period,
      });
      toast.success(`Pago registrado para ${employee.name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal state={modal}>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center" size="md">
          <Modal.Dialog className="!max-w-lg">
            <Modal.CloseTrigger />
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Icon>
                  <Wallet width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {employee ? `Pago a ${employee.name}` : "Registrar pago"}
                </Modal.Heading>
              </Modal.Header>

              <Modal.Body className="flex flex-col gap-5">
                {employee ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                      {employee.branch ? (
                        <span className="rounded-full bg-surface-secondary px-2.5 py-1">
                          {employee.branch.name}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-surface-secondary px-2.5 py-1">
                        {employee.completedAppointments} turno
                        {employee.completedAppointments === 1 ? "" : "s"} cobrados
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <SummaryCard
                        label="Comisiones"
                        value={formatMoney(employee.commissionTotal)}
                      />
                      <SummaryCard
                        label="Pagado"
                        value={formatMoney(employee.paidTotal)}
                        tone="success"
                      />
                      <SummaryCard
                        label="Pendiente"
                        value={formatMoney(employee.pendingAmount)}
                        tone="accent"
                      />
                    </div>

                    {employee.commissionTotal <= 0 ? (
                      <p className="rounded-xl border border-separator bg-surface-secondary/30 px-3 py-2.5 text-sm text-muted">
                        Este empleado no tiene comisiones en el período. Puedes
                        registrar un pago adelantado o por otro concepto.
                      </p>
                    ) : null}

                    <div className="flex w-full flex-col gap-2">
                      <div className="flex items-end justify-between gap-3">
                        <Label htmlFor="payment-amount" className="text-sm font-medium">
                          Monto a pagar
                        </Label>
                        {employee.pendingAmount > 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 min-h-0 px-2 text-xs"
                            onPress={() =>
                              setAmount(String(employee.pendingAmount))
                            }
                          >
                            Usar pendiente
                          </Button>
                        ) : null}
                      </div>
                      <AppNumberField
                        id="payment-amount"
                        minValue={0}
                        step={0.01}
                        isRequired
                        value={amount === "" ? undefined : Number(amount)}
                        onChange={(v) => setAmount(String(v))}
                        inputClassName="w-full text-lg font-semibold tabular-nums"
                      />
                      {exceedsPending ? (
                        <p className="text-xs text-warning">
                          El monto supera lo pendiente (
                          {formatMoney(employee.pendingAmount)}). Se liquidarán
                          comisiones en orden hasta cubrir el monto.
                        </p>
                      ) : null}
                    </div>

                    <div className="w-full">
                      <SelectField
                        label="Método de pago"
                        selectedKey={method}
                        onSelectionChange={(key) =>
                          setMethod((key as PaymentMethodValue) ?? "transfer")
                        }
                        options={paymentMethodOptions.map((option) => ({
                          id: option,
                          label: paymentMethodLabel[option],
                        }))}
                        className="w-full"
                      />
                    </div>

                    <div className="flex w-full flex-col gap-1.5">
                      <Label htmlFor="payment-notes" className="text-sm font-medium">
                        Notas (opcional)
                      </Label>
                      <textarea
                        id="payment-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Quincena, referencia bancaria, observaciones..."
                        rows={3}
                        className="w-full resize-y rounded-xl border border-separator bg-field-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
                      />
                    </div>

                    {isValidAmount ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted">
                          {method === "cash" ? (
                            <Wallet width={16} height={16} />
                          ) : (
                            <CreditCard width={16} height={16} />
                          )}
                          <span>{paymentMethodLabel[method]}</span>
                          <ArrowRightArrowLeft width={14} height={14} />
                          <span className="font-medium text-foreground">
                            {employee.name}
                          </span>
                        </div>
                        <p className="text-lg font-bold tabular-nums text-accent">
                          {formatMoney(parsedAmount)}
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </Modal.Body>

              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={pending || !employee || !isValidAmount}
                >
                  {pending ? "Guardando..." : "Confirmar pago"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

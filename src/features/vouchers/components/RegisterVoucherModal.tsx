"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Label, Modal, toast, useOverlayState } from "@heroui/react";
import HandCoins from "@gravity-ui/icons/CreditCard";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { SelectField } from "@/shared/components/SelectField";
import { formatMoney } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import { createVoucher } from "../services/voucher-service";
import type { VoucherEmployee } from "../types";
import { SearchableSelect } from "@/shared/components/SearchableSelect";

interface Props {
  employees: VoucherEmployee[];
  /** Preselección al abrir desde la fila de un empleado. */
  employee: VoucherEmployee | null;
  branchId: number | null;
  modal: ReturnType<typeof useOverlayState>;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegisterVoucherModal({
  employees,
  employee,
  branchId,
  modal,
  onClose,
  onSuccess,
}: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodValue>("cash");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!modal.isOpen) return;
    setUserId(employee ? String(employee.personId) : null);
    setAmount("");
    setMethod("cash");
    setReason("");
  }, [employee, modal.isOpen]);

  const selected = useMemo(
    () => employees.find((e) => String(e.personId) === userId) ?? null,
    [employees, userId],
  );

  const parsedAmount = Number(amount);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.danger("Elegí un empleado");
      return;
    }
    if (!isValidAmount) {
      toast.danger("Ingresá un monto válido");
      return;
    }

    setPending(true);
    try {
      await createVoucher({
        userId: selected.personId,
        amount: parsedAmount,
        method,
        reason,
        branchId,
      });
      toast.success(
        `Vale de ${formatMoney(parsedAmount)} para ${selected.name}`,
      );
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
                  <HandCoins width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>Nuevo vale</Modal.Heading>
              </Modal.Header>

              <Modal.Body className="flex flex-col gap-4">
                <SearchableSelect
                  label="Empleado"
                  placeholder="Elegí a quién le das el adelanto"
                  selectedKey={userId}
                  onSelectionChange={setUserId}
                  options={employees.map((e) => ({
                    id: String(e.personId),
                    label: e.branch ? `${e.name} · ${e.branch.name}` : e.name,
                    textValue: e.name,
                  }))}
                />

                {selected && selected.pendingAmount > 0 ? (
                  <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
                    {selected.name} ya tiene{" "}
                    <span className="font-semibold tabular-nums">
                      {formatMoney(selected.pendingAmount)}
                    </span>{" "}
                    en vales sin descontar ({selected.pendingCount}).
                  </p>
                ) : null}

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="voucher-amount"
                    className="text-sm font-medium"
                  >
                    Monto del adelanto
                  </Label>
                  <AppNumberField
                    id="voucher-amount"
                    minValue={0}
                    step={0.01}
                    isRequired
                    value={amount === "" ? undefined : Number(amount)}
                    onChange={(v) => setAmount(String(v))}
                    inputClassName="w-full text-lg font-semibold tabular-nums"
                  />
                </div>

                <SelectField
                  label="Cómo se le entrega"
                  selectedKey={method}
                  onSelectionChange={(key) =>
                    setMethod((key as PaymentMethodValue) ?? "cash")
                  }
                  options={paymentMethodOptions.map((option) => ({
                    id: option,
                    label: paymentMethodLabel[option],
                  }))}
                />

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="voucher-reason"
                    className="text-sm font-medium"
                  >
                    Motivo (opcional)
                  </Label>
                  <textarea
                    id="voucher-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Adelanto quincena, urgencia médica, etc."
                    rows={3}
                    className="w-full resize-y rounded-xl border border-separator bg-field-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
                  />
                </div>

                <p className="text-xs text-muted">
                  El vale se descuenta del sueldo en la liquidación semanal.
                </p>
              </Modal.Body>

              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={pending || !selected || !isValidAmount}
                >
                  {pending
                    ? "Guardando..."
                    : `Dar vale ${isValidAmount ? formatMoney(parsedAmount) : ""}`.trim()}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

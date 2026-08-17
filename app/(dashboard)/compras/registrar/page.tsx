"use client";

import { PageHeader } from "@/shared/components/ui";
import {
  PurchaseForm,
  useSuppliers,
} from "@/src/features/purchases";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";

export default function RegisterPurchasePage() {
  const { suppliers, refetch } = useSuppliers();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        icon={<ShoppingCart width={24} height={24} />}
        title="Registrar compra"
        description="Ingresa productos al inventario y registra el pago al proveedor"
      />

      <div className="rounded-2xl border border-separator bg-surface p-4 sm:p-6">
        <PurchaseForm suppliers={suppliers} onSuccess={() => void refetch()} />
      </div>
    </div>
  );
}

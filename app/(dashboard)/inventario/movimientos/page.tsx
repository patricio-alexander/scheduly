"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import ArrowDownToLine from "@gravity-ui/icons/ArrowDownToLine";

export default function InventoryMovementsPage() {
  return (
    <ModulePlaceholder
      icon={<ArrowDownToLine width={24} height={24} />}
      title="Movimientos"
      description="Kardex de entradas y salidas por sucursal (multistock)."
      moduleLabel="Inventario"
    />
  );
}

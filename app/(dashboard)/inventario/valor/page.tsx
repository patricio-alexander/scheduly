"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import CircleDollar from "@gravity-ui/icons/CircleDollar";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<CircleDollar width={24} height={24} />}
      title="Valor de inventario"
      description="Valor a costo y a precio de venta."
      moduleLabel="Inventario"
    />
  );
}

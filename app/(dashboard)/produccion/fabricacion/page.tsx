"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Factory from "@gravity-ui/icons/Factory";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Factory width={24} height={24} />}
      title="Producción"
      description="Órdenes de producción y consumo de insumos."
      moduleLabel="Producción"
    />
  );
}

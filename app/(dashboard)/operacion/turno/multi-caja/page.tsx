"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Layers from "@gravity-ui/icons/Layers";

export default function MultiCashPage() {
  return (
    <ModulePlaceholder
      icon={<Layers width={24} height={24} />}
      title="Multi-caja por local"
      description="Abrir y operar varias cajas en paralelo en la misma sucursal."
      moduleLabel="Operación"
    />
  );
}

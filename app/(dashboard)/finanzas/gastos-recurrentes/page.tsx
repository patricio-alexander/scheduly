"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Receipt from "@gravity-ui/icons/Receipt";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Receipt width={24} height={24} />}
      title="Gastos recurrentes"
      description="Plantillas y cuotas de gastos fijos."
      moduleLabel="Finanzas"
    />
  );
}

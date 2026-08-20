"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Car from "@gravity-ui/icons/Car";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Car width={24} height={24} />}
      title="Guías de remisión"
      description="Guías de remisión electrónicas."
      moduleLabel="Comprobantes electrónicos"
    />
  );
}

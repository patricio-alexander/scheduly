"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Display from "@gravity-ui/icons/Display";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Display width={24} height={24} />}
      title="Dispositivos TV"
      description="Pantallas vinculadas al negocio."
      moduleLabel="Marketing"
    />
  );
}

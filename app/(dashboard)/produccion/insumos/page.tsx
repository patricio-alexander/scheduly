"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Flask from "@gravity-ui/icons/Flask";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Flask width={24} height={24} />}
      title="Insumos y marcas"
      description="Materias primas y presentaciones."
      moduleLabel="Producción"
    />
  );
}

"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Cube from "@gravity-ui/icons/Cube";

export default function InventoryUnitsPage() {
  return (
    <ModulePlaceholder
      icon={<Cube width={24} height={24} />}
      title="Unidades"
      description="Define las unidades de medida de tu inventario"
      moduleLabel="Inventario"
    />
  );
}

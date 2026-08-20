"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Layers from "@gravity-ui/icons/Layers";

export default function InventoryBatchesPage() {
  return (
    <ModulePlaceholder
      icon={<Layers width={24} height={24} />}
      title="Lotes"
      description="Lotes y vencimientos de productos e insumos."
      moduleLabel="Inventario"
    />
  );
}

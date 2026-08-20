"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import LayoutHeaderCells from "@gravity-ui/icons/LayoutHeaderCells";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<LayoutHeaderCells width={24} height={24} />}
      title="Tramos"
      description="Precios por cantidad (tramos)."
      moduleLabel="Inventario"
    />
  );
}

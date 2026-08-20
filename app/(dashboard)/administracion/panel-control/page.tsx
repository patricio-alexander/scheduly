"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Gear from "@gravity-ui/icons/Gear";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Gear width={24} height={24} />}
      title="Panel de control"
      description="Herramientas de administración."
      moduleLabel="Administración"
    />
  );
}

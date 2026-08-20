"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Pencil from "@gravity-ui/icons/Pencil";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Pencil width={24} height={24} />}
      title="Editor de diseño"
      description="Editor de piezas promocionales."
      moduleLabel="Marketing"
    />
  );
}

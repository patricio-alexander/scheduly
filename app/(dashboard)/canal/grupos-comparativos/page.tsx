"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import CopyPlus from "@gravity-ui/icons/CopyPlus";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<CopyPlus width={24} height={24} />}
      title="Grupos comparativos"
      description="Comparadores de productos."
      moduleLabel="Canal digital"
    />
  );
}

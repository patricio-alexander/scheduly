"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Play from "@gravity-ui/icons/Play";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Play width={24} height={24} />}
      title="Reproductor"
      description="Reproductor de campañas."
      moduleLabel="Marketing"
    />
  );
}

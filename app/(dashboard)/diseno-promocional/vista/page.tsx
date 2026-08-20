"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Pulse from "@gravity-ui/icons/Pulse";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Pulse width={24} height={24} />}
      title="Vista con productos"
      description="Vista previa con productos."
      moduleLabel="Marketing"
    />
  );
}

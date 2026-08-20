"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Gift from "@gravity-ui/icons/Gift";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Gift width={24} height={24} />}
      title="Donaciones"
      description="Apoyo al proyecto."
      moduleLabel="Sistema"
    />
  );
}

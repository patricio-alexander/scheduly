"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Star from "@gravity-ui/icons/Star";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Star width={24} height={24} />}
      title="Productos destacados"
      description="Destacados en vitrina pública."
      moduleLabel="Canal digital"
    />
  );
}

"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Megaphone from "@gravity-ui/icons/Megaphone";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Megaphone width={24} height={24} />}
      title="Noticias"
      description="Noticias y novedades del canal."
      moduleLabel="Marketing"
    />
  );
}

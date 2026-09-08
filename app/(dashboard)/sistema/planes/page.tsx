"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import CircleInfo from "@gravity-ui/icons/CircleInfo";

/** Info del sistema (Programador / área sistema). */
export default function InfoPage() {
  return (
    <ModulePlaceholder
      icon={<CircleInfo width={24} height={24} />}
      title="Info"
      description="Información del sistema Scheduly (versión, entorno y estado)."
      moduleLabel="Sistema"
    />
  );
}

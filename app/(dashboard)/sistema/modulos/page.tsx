"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Layers from "@gravity-ui/icons/Layers";

/** Módulos del sistema (Programador / área sistema). */
export default function ModulesPage() {
  return (
    <ModulePlaceholder
      icon={<Layers width={24} height={24} />}
      title="Módulos"
      description="Catálogo de módulos y secciones de Scheduly."
      moduleLabel="Sistema"
    />
  );
}

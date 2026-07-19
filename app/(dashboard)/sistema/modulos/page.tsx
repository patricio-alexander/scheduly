"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Puzzle from "@gravity-ui/icons/Puzzle";

export default function ModulesPage() {
  return (
    <ModulePlaceholder
      icon={<Puzzle width={24} height={24} />}
      title="Módulos"
      description="Activa o desactiva módulos disponibles en Scheduly"
      moduleLabel="Sistema"
    />
  );
}

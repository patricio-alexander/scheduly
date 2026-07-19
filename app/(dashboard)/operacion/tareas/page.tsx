"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import ListCheck from "@gravity-ui/icons/ListCheck";

export default function TasksPage() {
  return (
    <ModulePlaceholder
      icon={<ListCheck width={24} height={24} />}
      title="Tareas"
      description="Gestiona pendientes y seguimiento operativo del día a día"
      moduleLabel="Operación"
    />
  );
}

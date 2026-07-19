"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Shield from "@gravity-ui/icons/Shield";

export default function RolesPage() {
  return (
    <ModulePlaceholder
      icon={<Shield width={24} height={24} />}
      title="Roles"
      description="Administra permisos y roles de acceso del sistema"
      moduleLabel="Administración"
    />
  );
}

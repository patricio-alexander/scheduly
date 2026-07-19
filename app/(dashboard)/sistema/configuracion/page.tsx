"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Gear from "@gravity-ui/icons/Gear";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      icon={<Gear width={24} height={24} />}
      title="Configuración"
      description="Ajusta preferencias generales de tu negocio"
      moduleLabel="Sistema"
    />
  );
}

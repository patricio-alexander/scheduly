"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Person from "@gravity-ui/icons/Person";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Person width={24} height={24} />}
      title="Cuentas"
      description="Cuentas vinculadas / multi-cuenta."
      moduleLabel="Administración"
    />
  );
}

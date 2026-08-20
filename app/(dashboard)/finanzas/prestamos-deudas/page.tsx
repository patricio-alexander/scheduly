"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Wallet from "@gravity-ui/icons/Wallet";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Wallet width={24} height={24} />}
      title="Préstamos y deudas"
      description="Préstamos y deudas del negocio."
      moduleLabel="Finanzas"
    />
  );
}

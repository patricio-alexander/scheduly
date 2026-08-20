"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Wallet from "@gravity-ui/icons/Wallet";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Wallet width={24} height={24} />}
      title="Retenciones"
      description="Comprobantes de retención."
      moduleLabel="Comprobantes electrónicos"
    />
  );
}

"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import FileDollar from "@gravity-ui/icons/FileDollar";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<FileDollar width={24} height={24} />}
      title="Notas de crédito"
      description="Notas de crédito electrónicas."
      moduleLabel="Comprobantes electrónicos"
    />
  );
}

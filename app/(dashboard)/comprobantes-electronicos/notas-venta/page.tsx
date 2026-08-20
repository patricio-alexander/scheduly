"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Receipt from "@gravity-ui/icons/Receipt";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Receipt width={24} height={24} />}
      title="Notas de venta"
      description="Notas de venta electrónicas SRI."
      moduleLabel="Comprobantes electrónicos"
    />
  );
}

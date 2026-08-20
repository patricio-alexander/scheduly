"use client";

import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import Book from "@gravity-ui/icons/Book";

export default function Page() {
  return (
    <ModulePlaceholder
      icon={<Book width={24} height={24} />}
      title="Plantillas"
      description="Plantillas de diseño promocional."
      moduleLabel="Marketing"
    />
  );
}

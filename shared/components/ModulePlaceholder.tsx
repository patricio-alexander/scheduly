import type { ReactNode } from "react";
import { PageHeader } from "@/shared/components/ui";

export function ModulePlaceholder({
  icon,
  title,
  description,
  moduleLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  moduleLabel: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={icon} title={title} description={description} />
      <div className="rounded-2xl border border-dashed border-separator bg-surface-secondary/40 px-6 py-16 text-center">
        <p className="text-sm font-medium">Módulo en preparación</p>
        <p className="mt-2 text-sm text-muted">
          {title} formará parte de <span className="font-medium text-foreground">{moduleLabel}</span>.
          Pronto podrás gestionar esta sección desde aquí.
        </p>
      </div>
    </div>
  );
}

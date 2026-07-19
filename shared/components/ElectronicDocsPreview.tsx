"use client";

import Link from "next/link";
import FileDollar from "@gravity-ui/icons/FileDollar";
import { PageHeader } from "@/shared/components/ui";
import { electronicDocsSections } from "@/shared/utils/app-routes";
import { useSubscription } from "@/src/features/subscription";
import {
  accessTitle,
  resolveAccessView,
  type AccessViewKind,
} from "@/src/features/subscription/lib/access-status";

function sectionBadgeClass(kind: AccessViewKind) {
  switch (kind) {
    case "maintenance":
      return "bg-danger/15 text-danger";
    case "planned":
      return "bg-warning/20 text-warning";
    case "development":
    case "developer":
      return "bg-accent/15 text-accent";
    default:
      return "bg-surface-secondary text-muted";
  }
}

export function ElectronicDocsPreview({
  activeHref,
}: {
  activeHref?: string;
}) {
  const { getModule, getSectionForPath, isDeveloper, isAppInMaintenance } =
    useSubscription();
  const entitlementModule = getModule("electronicDocs");
  const moduleAccess = entitlementModule
    ? resolveAccessView(entitlementModule.status, { isDeveloper })
    : "ok";

  const sections = electronicDocsSections.filter((s) => s.key !== "hub");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<FileDollar width={24} height={24} />}
        title="Comprobantes electrónicos"
        description="Facturas, notas y documentos SRI según tu suscripción"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const isActive = activeHref === section.href;
          const path = section.href.split("?")[0] ?? section.href;
          const { section: entitlementSection } = getSectionForPath(path);
          const sectionAccess = entitlementSection
            ? resolveAccessView(entitlementSection.status, { isDeveloper })
            : moduleAccess !== "ok"
              ? moduleAccess
              : "ok";
          const statusKind: AccessViewKind | null = isAppInMaintenance
            ? "maintenance"
            : sectionAccess !== "ok"
              ? sectionAccess
              : null;

          return (
            <Link
              key={section.href}
              href={section.href}
              className={`rounded-2xl border p-4 transition-colors ${
                isActive
                  ? "border-accent bg-accent/10"
                  : "border-separator bg-surface hover:border-accent/40 hover:bg-surface-secondary/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-tight">{section.label}</h2>
                {statusKind ? (
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${sectionBadgeClass(statusKind)}`}
                  >
                    {accessTitle(statusKind)}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

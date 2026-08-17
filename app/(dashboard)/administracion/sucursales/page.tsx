"use client";

import { useBranches } from "@/src/features/branches";
import House from "@gravity-ui/icons/House";
import { PageHeader } from "@/shared/components/ui";

export default function BranchesPage() {
  const { branches, loading } = useBranches();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        icon={<House width={24} height={24} />}
        title="Sucursales"
        description="Locales del negocio con agenda, stock y finanzas propias"
      />
      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-surface-secondary" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {branches.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-separator bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{b.name}</h2>
                  {b.isMain ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                      Casa matriz
                    </span>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-bold uppercase">
                  {b.code}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{b.address}</p>
              {b.phone ? <p className="mt-1 text-sm text-muted">{b.phone}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

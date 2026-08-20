"use client";

import Link from "next/link";
import Layers from "@gravity-ui/icons/Layers";
import House from "@gravity-ui/icons/House";
import Lock from "@gravity-ui/icons/Lock";
import { appRoutes } from "@/shared/utils/app-routes";
import { SCHEDULY_DEPLOYMENT } from "@/shared/utils/multi-branch";

/**
 * Scheduly = siempre multi-local + multistock (como EdDeli).
 * No hay switch para volver a un solo local.
 */
export function MultiBranchSettingsPanel() {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Layers width={18} height={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Locales y multistock
          </h2>
          <p className="mt-1 text-sm text-muted">
            {SCHEDULY_DEPLOYMENT.productName} opera siempre con varias
            sucursales y stock por local (feature gestor{" "}
            <code className="rounded bg-surface-secondary px-1 text-[11px]">
              {SCHEDULY_DEPLOYMENT.gestorFeatureKey}
            </code>
            ). No se puede desactivar.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-separator bg-surface-secondary/25 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Multistock (stock por local)</p>
            <p className="text-xs text-muted">Activo de forma permanente</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <Lock width={12} height={12} />
            Siempre ON
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-separator bg-surface-secondary/25 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Modo multi-local</p>
            <p className="text-xs text-muted">
              No existe modo “un solo local”
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <Lock width={12} height={12} />
            Bloqueado
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={appRoutes.channel.stores}
          className="inline-flex items-center gap-1.5 rounded-xl border border-separator bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-accent/5"
        >
          <House width={14} height={14} />
          Gestionar sucursales
        </Link>
        <Link
          href={appRoutes.branches.stock}
          className="inline-flex items-center gap-1.5 rounded-xl border border-separator bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-accent/5"
        >
          <Layers width={14} height={14} />
          Stock por local
        </Link>
      </div>
    </section>
  );
}

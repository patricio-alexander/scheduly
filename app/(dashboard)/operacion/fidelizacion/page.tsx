"use client";

import { useState } from "react";
import Link from "next/link";
import CrownDiamond from "@gravity-ui/icons/CrownDiamond";
import { PageHeader } from "@/shared/components/ui";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  EligibleCustomersPanel,
  OffersManager,
  RewardsManager,
} from "@/src/features/loyalty";

type Tab = "eligible" | "offers" | "rewards";

export default function LoyaltyHubPage() {
  const [tab, setTab] = useState<Tab>("eligible");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        icon={<CrownDiamond width={24} height={24} />}
        title="Fidelización"
        description="Clientes listos para canjear, ofertas por período y premios"
        action={
          <Link
            href={appRoutes.loyalty.customerPortal}
            className="inline-flex rounded-xl border border-separator px-3 py-2 text-sm font-medium hover:bg-surface-secondary"
          >
            Portal cliente →
          </Link>
        }
      />

      <div className="inline-flex w-fit overflow-x-auto rounded-xl border border-separator p-1">
        {(
          [
            ["eligible", "Clientes elegibles"],
            ["offers", "Ofertas"],
            ["rewards", "Premios"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-separator bg-surface p-4 text-sm text-muted">
        <p>
          Los clientes acumulan puntos al completar turnos. Con cuenta activa pueden
          iniciar sesión en{" "}
          <Link href={appRoutes.loyalty.customerPortal} className="font-semibold text-accent">
            Mi cuenta
          </Link>{" "}
          y reclamar premios; los puntos se descuentan automáticamente.
        </p>
        <Link
          href={appRoutes.loyalty.feed}
          className="mt-3 inline-flex font-semibold text-accent hover:underline"
        >
          Ver feed público de novedades →
        </Link>
      </div>

      {tab === "eligible" ? (
        <EligibleCustomersPanel />
      ) : tab === "offers" ? (
        <OffersManager />
      ) : (
        <RewardsManager />
      )}
    </div>
  );
}

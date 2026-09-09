"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/shared/components/PublicShell";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";

type Promo = {
  id: number;
  name: string;
  description: string;
  discountPct: number | null;
  comboLabel: string | null;
};

export default function PublicPromosPage() {
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promo[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/public/promociones"), {
          cache: "no-store",
        });
        const json = (await res.json()) as { promotions?: Promo[] };
        if (!cancelled) setPromotions(json.promotions ?? []);
      } catch {
        if (!cancelled) setPromotions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicShell active="promos">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Promociones</h1>
          <p className="mt-1 text-sm text-muted">
            Ofertas activas del local. También las ves en Novedades.
          </p>
        </header>

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-surface-secondary" />
        ) : promotions.length === 0 ? (
          <p className="rounded-2xl border border-separator bg-surface p-5 text-sm text-muted">
            No hay promociones activas por ahora.
          </p>
        ) : (
          <ul className="space-y-3">
            {promotions.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-accent/30 bg-accent/5 p-4"
              >
                <h2 className="font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted">{p.description}</p>
                {p.discountPct ? (
                  <p className="mt-2 text-sm font-bold text-accent">
                    {p.discountPct}% de descuento
                  </p>
                ) : null}
                {p.comboLabel ? (
                  <p className="mt-1 text-xs text-muted">{p.comboLabel}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href={appRoutes.loyalty.feed}
            className="text-accent hover:underline"
          >
            Novedades
          </Link>
          <Link
            href={appRoutes.loyalty.myTurn}
            className="text-accent hover:underline"
          >
            Mi turno
          </Link>
          <Link
            href={appRoutes.loyalty.publicCatalog}
            className="text-accent hover:underline"
          >
            Catálogo
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}

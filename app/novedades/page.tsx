"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/shared/components/PublicShell";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { useCustomerAuth } from "@/src/features/loyalty/hooks/useCustomerAuth";
import { RewardPointsMeter } from "@/src/features/loyalty/components/RewardPointsMeter";

type FeedData = {
  posts: Array<{ id: number; title: string; body: string; type: string }>;
  promotions: Array<{
    id: number;
    name: string;
    description: string;
    discountPct: number | null;
    comboLabel: string | null;
  }>;
  rewards: Array<{ id: number; name: string; description: string; pointsCost: number }>;
  loyaltyRules: { pointsPerAppointment: number; silverThreshold: number; goldThreshold: number };
};

export default function ClientFeedPage() {
  const { customer } = useCustomerAuth();
  const [data, setData] = useState<FeedData | null>(null);

  useEffect(() => {
    void fetch(apiUrl("/api/feed"))
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <PublicShell active="feed">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Novedades</h1>
          <p className="mt-1 text-sm text-muted">Promociones, premios y beneficios</p>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={appRoutes.booking}
            className="rounded-xl border border-separator px-4 py-2 text-sm font-medium hover:bg-surface-secondary"
          >
            Reservar turno
          </Link>
          {!customer ? (
            <Link
              href={appRoutes.loyalty.customerPortal}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Mi cuenta / Canjear premios
            </Link>
          ) : (
            <span className="rounded-xl bg-surface-secondary px-4 py-2 text-sm font-medium tabular-nums">
              {customer.points} puntos
            </span>
          )}
        </div>

        {!data ? (
          <div className="h-40 animate-pulse rounded-2xl bg-surface-secondary" />
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Promociones activas</h2>
              {data.promotions.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-accent/30 bg-accent/5 p-4"
                >
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted">{p.description}</p>
                  {p.discountPct ? (
                    <p className="mt-2 text-sm font-bold text-accent">
                      {p.discountPct}% de descuento
                    </p>
                  ) : null}
                </article>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Premios canjeables</h2>
              <p className="text-sm text-muted">
                Gana {data.loyaltyRules.pointsPerAppointment} puntos por cada turno completado.
                Nivel plata desde {data.loyaltyRules.silverThreshold} pts · oro desde{" "}
                {data.loyaltyRules.goldThreshold} pts.
              </p>
              {data.rewards.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl border border-separator bg-surface p-4"
                >
                  <h3 className="font-semibold">{r.name}</h3>
                  <p className="mt-1 text-sm text-muted">{r.description}</p>
                  {customer ? (
                    <div className="mt-3">
                      <RewardPointsMeter
                        currentPoints={customer.points}
                        pointsCost={r.pointsCost}
                        label={r.name}
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-bold">{r.pointsCost} puntos</p>
                  )}
                </article>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Novedades</h2>
              {data.posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-separator bg-surface p-4"
                >
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="mt-1 text-sm text-muted">{post.body}</p>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </PublicShell>
  );
}

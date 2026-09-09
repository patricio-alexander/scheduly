"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/shared/components/PublicShell";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";

type ProductRow = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  unit: string | null;
};

function money(n: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default function PublicCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/public/catalogo"), {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          enabled?: boolean;
          products?: ProductRow[];
          message?: string;
        };
        if (cancelled) return;
        setEnabled(json.enabled !== false);
        setMessage(json.message ?? null);
        setProducts(json.products ?? []);
      } catch {
        if (!cancelled) {
          setEnabled(false);
          setMessage("No se pudo cargar el catálogo");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicShell active="catalog">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
          <p className="mt-1 text-sm text-muted">
            Productos del local. Visible solo si la dueña lo tiene activado.
          </p>
        </header>

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-surface-secondary" />
        ) : !enabled ? (
          <p className="rounded-2xl border border-separator bg-surface p-5 text-sm text-muted">
            {message || "El catálogo público está desactivado."}
          </p>
        ) : products.length === 0 ? (
          <p className="rounded-2xl border border-separator bg-surface p-5 text-sm text-muted">
            Aún no hay productos publicados.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-separator bg-surface p-4"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={apiUrl(p.imageUrl)}
                    alt=""
                    className="mb-3 h-28 w-full rounded-xl object-cover"
                  />
                ) : null}
                <h2 className="font-semibold">{p.name}</h2>
                {p.category ? (
                  <p className="mt-0.5 text-xs text-muted">{p.category}</p>
                ) : null}
                {p.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-muted">
                    {p.description}
                  </p>
                ) : null}
                <p className="mt-3 text-sm font-bold text-accent">
                  {money(p.price)}
                  {p.unit ? (
                    <span className="font-normal text-muted"> / {p.unit}</span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href={appRoutes.loyalty.myTurn}
            className="text-accent hover:underline"
          >
            Mi turno
          </Link>
          <Link
            href={appRoutes.loyalty.promos}
            className="text-accent hover:underline"
          >
            Promos
          </Link>
          <Link href={appRoutes.booking} className="text-accent hover:underline">
            Reservar
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}

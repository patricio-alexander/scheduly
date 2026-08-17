"use client";

import { useEffect, useState } from "react";
import Tag from "@gravity-ui/icons/Tag";
import { PageHeader } from "@/shared/components/ui";
import { apiUrl } from "@/shared/utils/api";

type Promotion = {
  id: number;
  name: string;
  description: string;
  discountPct: number | null;
  comboLabel: string | null;
  isActive: boolean;
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    void fetch(apiUrl("/api/promotions"), { credentials: "include" })
      .then((r) => r.json())
      .then(setPromotions);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        icon={<Tag width={24} height={24} />}
        title="Promociones"
        description="Ofertas, combos y descuentos por servicio y sucursal"
      />
      <ul className="grid gap-3">
        {promotions.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-separator bg-surface p-4"
          >
            <h2 className="font-semibold">{p.name}</h2>
            <p className="mt-1 text-sm text-muted">{p.description}</p>
            {p.discountPct ? (
              <p className="mt-2 text-sm font-bold text-accent">{p.discountPct}% OFF</p>
            ) : null}
            {p.comboLabel ? (
              <p className="mt-1 text-xs font-medium text-muted">{p.comboLabel}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

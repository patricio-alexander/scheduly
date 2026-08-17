"use client";

import Link from "next/link";
import { PageHeader } from "@/shared/components/ui";
import { appRoutes } from "@/shared/utils/app-routes";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import { DirectProductSaleForm } from "@/src/features/sales";

export default function RegisterProductSalePage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        icon={<ShoppingCart width={24} height={24} />}
        title="Registrar venta"
        description="Vende productos en mostrador sin necesidad de un turno en agenda"
        action={
          <Link
            href={appRoutes.sales.productSales}
            className="text-sm font-medium text-accent hover:underline"
          >
            Ver productos vendidos
          </Link>
        }
      />

      <div className="rounded-2xl border border-separator bg-surface p-4 sm:p-6">
        <DirectProductSaleForm />
      </div>
    </div>
  );
}

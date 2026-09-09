"use client";

import { useEffect } from "react";
import { Button, toast } from "@heroui/react";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import ArrowRotateLeft from "@gravity-ui/icons/ArrowRotateLeft";
import { PageHeader } from "@/shared/components/ui";
import { useAuth } from "@/src/features/auth";
import { isManagementRole } from "@/shared/utils/roles";
import {
  InventoryValuePanel,
  useInventoryValue,
} from "@/src/features/inventory-value";

export default function InventoryValuePage() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useInventoryValue();

  useEffect(() => {
    if (error) toast.danger(error);
  }, [error]);

  if (!user || !isManagementRole(user.role)) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<CircleDollar width={24} height={24} />}
        title="Inventario valorizado"
        description="Stock de productos a costo (proveedor o última compra) y a precio de venta. Para Dueña y administradores."
        action={
          <Button variant="secondary" onPress={() => void refetch()}>
            <ArrowRotateLeft width={16} height={16} />
            Actualizar
          </Button>
        }
      />

      <InventoryValuePanel
        items={data?.items ?? []}
        summary={
          data?.summary ?? {
            productCount: 0,
            withStockCount: 0,
            missingCostCount: 0,
            totalValueCost: 0,
            totalValueSale: 0,
            totalMargin: 0,
          }
        }
        loading={loading}
      />
    </div>
  );
}

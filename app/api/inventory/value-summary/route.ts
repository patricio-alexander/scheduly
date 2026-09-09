import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { toAmount } from "@/shared/utils/money";

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Inventario valorizado · productos (stock × costo / precio venta).
 * Costo: supplierPrice; si es 0, última compra (PurchaseOrderLine).
 * Solo Dueña y Administrador.
 */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        price: true,
        supplierPrice: true,
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
      },
    });

    const productIds = products.map((p) => p.id);
    const lastCost = new Map<number, number>();

    if (productIds.length > 0) {
      const lines = await prisma.purchaseOrderLine.findMany({
        where: {
          productId: { in: productIds },
          unitPrice: { gt: 0 },
        },
        select: {
          productId: true,
          unitPrice: true,
          purchaseOrder: { select: { date: true, id: true } },
        },
        orderBy: [{ purchaseOrder: { date: "desc" } }, { id: "desc" }],
      });
      for (const line of lines) {
        if (!lastCost.has(line.productId)) {
          lastCost.set(line.productId, toAmount(line.unitPrice));
        }
      }
    }

    const items = products.map((p) => {
      const stock = toAmount(p.stock);
      const salePrice = toAmount(p.price);
      const catalogCost = toAmount(p.supplierPrice);
      const purchaseCost = lastCost.get(p.id) ?? 0;
      const costSource =
        catalogCost > 0 ? "catalog" : purchaseCost > 0 ? "purchase" : "none";
      const unitCost =
        costSource === "catalog"
          ? catalogCost
          : costSource === "purchase"
            ? purchaseCost
            : 0;
      const valueCost = round2(stock * unitCost);
      const valueSale = round2(stock * salePrice);
      const margin = round2(valueSale - valueCost);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name ?? null,
        unit: p.unit
          ? `${p.unit.abbreviation || p.unit.name}`
          : null,
        stock,
        unitCost,
        salePrice,
        valueCost,
        valueSale,
        margin,
        costSource,
        hasStock: stock > 0,
        missingCost: stock > 0 && unitCost <= 0,
      };
    });

    const withStock = items.filter((i) => i.hasStock);
    const summary = {
      productCount: items.length,
      withStockCount: withStock.length,
      missingCostCount: items.filter((i) => i.missingCost).length,
      totalValueCost: round2(
        withStock.reduce((s, i) => s + i.valueCost, 0),
      ),
      totalValueSale: round2(
        withStock.reduce((s, i) => s + i.valueSale, 0),
      ),
      totalMargin: round2(withStock.reduce((s, i) => s + i.margin, 0)),
    };

    return NextResponse.json({ summary, items });
  } catch (error) {
    console.error("GET /api/inventory/value-summary", error);
    return NextResponse.json(
      { message: "Error al valorizar inventario" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";

/** Mesa de cuentas por pagar a proveedores. */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const purchases = await prisma.purchaseOrder.findMany({
      where: { status: { not: "cancelado" } },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            identNumber: true,
            phone: true,
          },
        },
        lines: {
          include: { product: { select: { name: true } } },
        },
        payments: true,
      },
      orderBy: { date: "desc" },
      take: 1000,
    });

    const bySupplier = new Map<
      number,
      { supplierId: number; supplierName: string; remaining: number; orders: number }
    >();

    const orders = purchases.map((po) => {
      const total = po.lines.reduce(
        (s, l) => s + toAmount(l.quantity) * toAmount(l.unitPrice),
        0,
      );
      const paidFromList = po.payments
        .filter((p) => p.status === "completed")
        .reduce((s, p) => s + toAmount(p.amount), 0);
      const paid = po.paidAt
        ? Math.max(paidFromList, total)
        : paidFromList;
      const remaining = Number(Math.max(0, total - paid).toFixed(2));
      const name = po.supplier.tradeName?.trim() || po.supplier.name;

      if (remaining > 0) {
        const row = bySupplier.get(po.supplierId) ?? {
          supplierId: po.supplierId,
          supplierName: name,
          remaining: 0,
          orders: 0,
        };
        row.remaining = Number((row.remaining + remaining).toFixed(2));
        row.orders += 1;
        bySupplier.set(po.supplierId, row);
      }

      return {
        id: po.id,
        supplierId: po.supplierId,
        supplierName: name,
        date: po.date.toISOString(),
        invoiceNumber: po.invoiceNumber,
        status: po.status,
        totalAmount: Number(total.toFixed(2)),
        paidAmount: Number(paid.toFixed(2)),
        remainingAmount: remaining,
        paidAt: po.paidAt?.toISOString() ?? null,
        receivedAt: po.receivedAt?.toISOString() ?? null,
        items: po.lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          name: l.product.name,
          product: l.product.name,
          quantity: l.quantity,
          unitPrice: toAmount(l.unitPrice),
          taxRate: l.taxRate,
          packKey: l.packKey,
          packName: l.packName,
          lotCode: l.lotCode,
          expiresAt: l.expiresAt?.toISOString().slice(0, 10) ?? null,
          manufacturedAt: l.manufacturedAt?.toISOString().slice(0, 10) ?? null,
          lineTotal: Number(
            (toAmount(l.quantity) * toAmount(l.unitPrice)).toFixed(2),
          ),
        })),
        payments: po.payments.map((p) => ({
          id: p.id,
          amount: toAmount(p.amount),
          method: p.method,
          date: p.date.toISOString(),
          note: p.note,
          status: p.status,
        })),
      };
    });

    const futurePayable = [...bySupplier.values()].reduce(
      (s, r) => s + r.remaining,
      0,
    );

    return NextResponse.json({
      orders,
      pendingBySupplier: [...bySupplier.values()].sort(
        (a, b) => b.remaining - a.remaining,
      ),
      futurePayable: Number(futurePayable.toFixed(2)),
    });
  } catch (error) {
    console.error("GET /api/orders/supplier-payables/workbench", error);
    return NextResponse.json(
      { message: "Error al cargar cuentas por pagar" },
      { status: 500 },
    );
  }
}

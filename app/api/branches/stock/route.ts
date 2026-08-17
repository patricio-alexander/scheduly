import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { parseBranchId } from "@/shared/utils/branches";
import { canTransferStock } from "@/shared/utils/roles";

/** Stock por sucursal (matriz producto × local) */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!canTransferStock(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const branchId = parseBranchId(new URL(request.url).searchParams.get("branchId"));

    const [branches, products, stocks] = await Promise.all([
      prisma.branch.findMany({
        where: { isActive: true, ...(branchId ? { id: branchId } : {}) },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, code: true },
      }),
      prisma.product.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, stock: true },
      }),
      prisma.branchStock.findMany({
        where: branchId ? { branchId } : {},
        select: { branchId: true, productId: true, stock: true, minStock: true },
      }),
    ]);

    const stockMap = new Map(
      stocks.map((s) => [`${s.branchId}:${s.productId}`, s]),
    );

    const rows = products.map((product) => ({
      productId: product.id,
      name: product.name,
      totalStock: product.stock,
      branches: branches.map((branch) => {
        const row = stockMap.get(`${branch.id}:${product.id}`);
        const stock = row?.stock ?? 0;
        const minStock = row?.minStock ?? 5;
        return {
          branchId: branch.id,
          stock,
          minStock,
          lowStock: stock <= minStock,
        };
      }),
    }));

    return NextResponse.json({ branches, products: rows });
  } catch {
    return NextResponse.json({ message: "Error al obtener stock" }, { status: 500 });
  }
}

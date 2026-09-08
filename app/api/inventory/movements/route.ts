import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { toAmount } from "@/shared/utils/money";
import { recordStockMovement } from "@/shared/utils/stock-movement-log";
import { incrementBranchStock, deductBranchStock } from "@/shared/utils/branch-stock";

const TYPES = new Set(["entrada", "salida", "ajuste", "produccion"]);

/** Kardex de inventario: entradas, salidas, ajustes y traspasos (reason). */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const reason = url.searchParams.get("reason");
    const take = Math.min(500, Math.max(20, Number(url.searchParams.get("take")) || 200));

    const movements = await prisma.stockMovement.findMany({
      where: {
        ...(type && TYPES.has(type) ? { type: type as "entrada" | "salida" | "ajuste" | "produccion" } : {}),
        ...(reason ? { reason } : {}),
      },
      orderBy: { date: "desc" },
      take,
      include: {
        product: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json(
      movements.map((m) => ({
        id: m.id,
        date: m.date.toISOString(),
        type: m.type,
        /** etiqueta UI: traspaso si reason=traspaso */
        kind:
          m.reason === "traspaso"
            ? "traspaso"
            : m.type === "entrada"
              ? "entrada"
              : m.type === "salida"
                ? "salida"
                : m.type === "ajuste"
                  ? "ajuste"
                  : m.type,
        quantity: toAmount(m.quantity),
        description: m.description ?? "",
        reason: m.reason ?? "",
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        product: m.product,
        createdBy: m.creator.username ?? `#${m.creator.id}`,
      })),
    );
  } catch (error) {
    console.error("GET /api/inventory/movements", error);
    return NextResponse.json(
      { message: "Error al listar movimientos" },
      { status: 500 },
    );
  }
}

/** Alta manual de ajuste / entrada / salida (dueña/admin). */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);
    const type = String(body.type ?? "ajuste");
    const branchIdRaw = body.branchId;
    const branchId =
      branchIdRaw == null || branchIdRaw === ""
        ? null
        : Number(branchIdRaw);
    const description = String(body.description ?? "").trim();
    const reason = String(body.reason ?? type).trim() || type;
    const dateRaw = body.date ? new Date(String(body.date)) : new Date();
    const date = Number.isNaN(dateRaw.getTime()) ? new Date() : dateRaw;

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ message: "Producto inválido" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ message: "Cantidad inválida" }, { status: 400 });
    }
    if (!TYPES.has(type)) {
      return NextResponse.json({ message: "Tipo inválido" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true },
    });
    if (!product) {
      return NextResponse.json({ message: "Producto no encontrado" }, { status: 404 });
    }

    const movement = await prisma.$transaction(async (tx) => {
      if (branchId && Number.isInteger(branchId) && branchId > 0) {
        if (type === "entrada" || (type === "ajuste" && reason === "entrada")) {
          await incrementBranchStock(tx, branchId, [{ productId, quantity }]);
        } else if (type === "salida" || (type === "ajuste" && reason === "salida")) {
          await deductBranchStock(tx, branchId, [{ productId, quantity }]);
        } else if (type === "ajuste") {
          // ajuste neutro: solo kardex; si hay branch y reason "reconteo" suma/resta vía body.deltaSign
          const sign = String(body.deltaSign ?? "in") === "out" ? "out" : "in";
          if (sign === "in") {
            await incrementBranchStock(tx, branchId, [{ productId, quantity }]);
          } else {
            await deductBranchStock(tx, branchId, [{ productId, quantity }]);
          }
        }
      }

      return recordStockMovement(tx, {
        productId,
        quantity,
        type: type as "entrada" | "salida" | "ajuste" | "produccion",
        createdBy: auth.user.id,
        description: description || `${type} · ${product.name}`,
        reason,
        referenceType: "manual",
        referenceId: branchId,
        price: product.price,
        date,
      });
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error("POST /api/inventory/movements", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Error al registrar movimiento",
      },
      { status: 400 },
    );
  }
}

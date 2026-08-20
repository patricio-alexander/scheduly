import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import type { SaleStatus } from "@/generated/prisma/client";

const STATUSES: SaleStatus[] = ["pendiente", "entregado", "pagado"];

function parseStatus(raw: string | null): SaleStatus | "all" {
  if (!raw || raw === "all") return "all";
  return STATUSES.includes(raw as SaleStatus) ? (raw as SaleStatus) : "all";
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const status = parseStatus(url.searchParams.get("status"));
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const take = Math.min(
      200,
      Math.max(1, Number(url.searchParams.get("take") ?? 80) || 80),
    );

    const sales = await prisma.sale.findMany({
      where: status === "all" ? undefined : { status },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            firstLastName: true,
            secondLastName: true,
            phone: true,
          },
        },
        seller: { select: { id: true, username: true } },
        cashRegister: { select: { id: true, name: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take,
    });

    const orders = sales
      .map((sale) => {
        const customerName = [
          sale.customer.name,
          sale.customer.firstLastName,
          sale.customer.secondLastName,
        ]
          .filter(Boolean)
          .join(" ");
        const total = sale.lines.reduce(
          (sum, line) => sum + toAmount(line.quantity) * toAmount(line.price),
          0,
        );
        const itemsSummary = sale.lines
          .map((line) =>
            line.quantity > 1
              ? `${line.product.name} ×${line.quantity}`
              : line.product.name,
          )
          .join(", ");

        return {
          id: sale.id,
          status: sale.status,
          date: sale.date.toISOString(),
          paidAt: sale.paidAt?.toISOString() ?? null,
          paymentMethod: sale.paymentMethod,
          notes: sale.notes,
          total,
          itemsSummary,
          lineCount: sale.lines.length,
          customer: {
            id: sale.customer.id,
            name: customerName,
            phone: sale.customer.phone,
          },
          seller: sale.seller
            ? { id: sale.seller.id, name: sale.seller.username }
            : null,
          cashRegister: sale.cashRegister,
        };
      })
      .filter((order) => {
        if (!q) return true;
        return (
          order.customer.name.toLowerCase().includes(q) ||
          order.itemsSummary.toLowerCase().includes(q) ||
          String(order.id).includes(q)
        );
      });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/orders", error);
    return NextResponse.json(
      { message: "Error al obtener pedidos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const customerId = Number(body.customerId);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json({ message: "Cliente requerido" }, { status: 400 });
    }

    const rawLines = Array.isArray(body.lines) ? body.lines : [];
    const lines = rawLines
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          productId: Number(r.productId),
          quantity: Number(r.quantity),
          price: Number(r.unitPrice ?? r.price),
        };
      })
      .filter(
        (l) =>
          Number.isInteger(l.productId) &&
          l.productId > 0 &&
          Number.isFinite(l.quantity) &&
          l.quantity > 0 &&
          Number.isFinite(l.price) &&
          l.price >= 0,
      );

    if (lines.length === 0) {
      return NextResponse.json(
        { message: "Agrega al menos un producto" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ message: "Cliente no encontrado" }, { status: 400 });
    }

    const notes = String(body.notes ?? "").trim() || null;
    const dateRaw = body.date ? new Date(String(body.date)) : new Date();
    const date = Number.isNaN(dateRaw.getTime()) ? new Date() : dateRaw;
    const saleType =
      String(body.saleType ?? "credito") === "contado" ? "contado" : "credito";
    const status =
      saleType === "contado" && body.markPaid === true ? "pagado" : "pendiente";
    const documentType =
      String(body.documentType ?? "").trim().slice(0, 30) || "documento";

    const sale = await prisma.sale.create({
      data: {
        customerId,
        sellerAccountId: auth.user.id,
        status,
        notes: notes
          ? `[PEDIDO] ${saleType === "credito" ? "[CREDITO] " : ""}${notes}`
          : `[PEDIDO]${saleType === "credito" ? " [CREDITO]" : ""}`,
        paymentMethod: saleType === "credito" ? "credito" : "cash",
        paidAt: status === "pagado" ? new Date() : null,
        date,
        documentType,
        lines: {
          create: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            price: line.price,
            soldQty: 0,
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ id: sale.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Error al crear pedido",
      },
      { status: 400 },
    );
  }
}

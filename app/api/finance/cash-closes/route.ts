import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
} from "@/shared/utils/roles";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { toAmount } from "@/shared/utils/money";
import { parseDateKey, toDateKey } from "@/shared/utils/payroll-settings";
import { DEFAULT_PAYMENT_MEDIA } from "@/shared/utils/payment-media";

async function ensureDefaultMedia() {
  const count = await prisma.paymentMedium.count();
  if (count > 0) return;
  await prisma.paymentMedium.createMany({
    data: DEFAULT_PAYMENT_MEDIA.map((m) => ({
      name: m.name,
      code: m.code,
      kind: m.kind,
      position: m.position,
      isActive: true,
    })),
  });
}

async function resolveBranchId(
  user: { id: number; role: string },
  requested: number | null,
): Promise<number> {
  if (isOwnerRole(user.role)) {
    if (!requested || requested <= 0) {
      throw new Error("Indicá la sucursal");
    }
    return requested;
  }
  if (isBranchAdminRole(user.role)) {
    const branchId = await getUserPrimaryBranchId(prisma, user.id);
    if (!branchId) throw new Error("No tienes una sucursal asignada");
    if (requested && requested !== branchId) {
      throw new Error("No puedes operar otra sucursal");
    }
    return branchId;
  }
  throw new Error("No autorizado");
}

function serializeClose(
  row: {
    id: number;
    branchId: number;
    closeDate: Date;
    expensesTotal: number;
    notes: string | null;
    createdById: number;
    createdAt: Date;
    updatedAt: Date;
    branch?: { id: number; name: string } | null;
    createdBy?: {
      id: number;
      person: {
        firstName: string | null;
        secondName?: string | null;
        firstLastName: string | null;
        secondLastName?: string | null;
      } | null;
    } | null;
    lines: Array<{
      id: number;
      paymentMediumId: number;
      amount: number;
      paymentMedium?: { id: number; name: string; kind: string; code: string | null };
    }>;
  },
) {
  const linesTotal = row.lines.reduce((s, l) => s + toAmount(l.amount), 0);
  const createdByName = row.createdBy?.person
    ? [row.createdBy.person.firstName, row.createdBy.person.firstLastName]
        .filter(Boolean)
        .join(" ")
        .trim()
    : null;
  return {
    id: row.id,
    branchId: row.branchId,
    closeDate: toDateKey(row.closeDate),
    expensesTotal: toAmount(row.expensesTotal),
    notes: row.notes,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    branch: row.branch ?? null,
    createdByName,
    lines: row.lines.map((l) => ({
      id: l.id,
      paymentMediumId: l.paymentMediumId,
      amount: toAmount(l.amount),
      medium: l.paymentMedium
        ? {
            id: l.paymentMedium.id,
            name: l.paymentMedium.name,
            kind: l.paymentMedium.kind,
            code: l.paymentMedium.code,
          }
        : null,
    })),
    linesTotal: Math.round(linesTotal * 100) / 100,
    netTotal: Math.round((linesTotal - toAmount(row.expensesTotal)) * 100) / 100,
  };
}

/** GET cuadres · ?date=YYYY-MM-DD&branchId= */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureDefaultMedia();
    const url = new URL(request.url);
    const dateKey = url.searchParams.get("date") || toDateKey(new Date());
    const date = parseDateKey(dateKey);
    if (!date) {
      return NextResponse.json({ message: "Fecha inválida" }, { status: 400 });
    }

    const branchRaw = url.searchParams.get("branchId");
    const requested =
      branchRaw != null && branchRaw !== "" ? Number(branchRaw) : null;

    let branchId: number | null = null;
    if (isOwnerRole(auth.user.role)) {
      branchId =
        requested && Number.isInteger(requested) && requested > 0
          ? requested
          : null;
    } else {
      branchId = await resolveBranchId(auth.user, requested);
    }

    const media = await prisma.paymentMedium.findMany({
      where: { isActive: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });

    const closes = await prisma.cashClose.findMany({
      where: {
        closeDate: date,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: {
          select: {
            id: true,
            person: {
              select: {
                firstName: true,
                secondName: true,
                firstLastName: true,
                secondLastName: true,
              },
            },
          },
        },
        lines: {
          include: {
            paymentMedium: {
              select: { id: true, name: true, kind: true, code: true },
            },
          },
        },
      },
      orderBy: { branchId: "asc" },
    });

    return NextResponse.json({
      date: dateKey,
      media,
      closes: closes.map(serializeClose),
    });
  } catch (error) {
    console.error("GET /api/finance/cash-closes", error);
    const message =
      error instanceof Error ? error.message : "Error al obtener cuadres";
    return NextResponse.json({ message }, { status: 400 });
  }
}

/** POST / PUT upsert cuadre del día */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureDefaultMedia();
    const body = (await request.json()) as Record<string, unknown>;
    const date = parseDateKey(String(body.date ?? toDateKey(new Date())));
    if (!date) {
      return NextResponse.json({ message: "Fecha inválida" }, { status: 400 });
    }

    const branchId = await resolveBranchId(
      auth.user,
      body.branchId != null ? Number(body.branchId) : null,
    );

    const expensesTotal = Math.max(0, toAmount(body.expensesTotal));
    const notes = String(body.notes ?? "").trim() || null;
    const rawLines = Array.isArray(body.lines) ? body.lines : [];

    const lineData: Array<{ paymentMediumId: number; amount: number }> = [];
    for (const raw of rawLines) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const paymentMediumId = Number(row.paymentMediumId);
      const amount = Math.max(0, toAmount(row.amount));
      if (!Number.isInteger(paymentMediumId) || paymentMediumId <= 0) continue;
      lineData.push({ paymentMediumId, amount });
    }

    const close = await prisma.$transaction(async (tx) => {
      const upserted = await tx.cashClose.upsert({
        where: {
          branchId_closeDate: { branchId, closeDate: date },
        },
        create: {
          branchId,
          closeDate: date,
          expensesTotal,
          notes,
          createdById: auth.user.id,
        },
        update: {
          expensesTotal,
          notes,
        },
      });

      await tx.cashCloseLine.deleteMany({ where: { cashCloseId: upserted.id } });
      if (lineData.length > 0) {
        await tx.cashCloseLine.createMany({
          data: lineData.map((l) => ({
            cashCloseId: upserted.id,
            paymentMediumId: l.paymentMediumId,
            amount: l.amount,
          })),
        });
      }

      return tx.cashClose.findUniqueOrThrow({
        where: { id: upserted.id },
        include: {
          branch: { select: { id: true, name: true } },
          createdBy: {
            select: {
              id: true,
              person: {
                select: {
                  firstName: true,
                  secondName: true,
                  firstLastName: true,
                  secondLastName: true,
                },
              },
            },
          },
          lines: {
            include: {
              paymentMedium: {
                select: { id: true, name: true, kind: true, code: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(serializeClose(close));
  } catch (error) {
    console.error("POST /api/finance/cash-closes", error);
    const message =
      error instanceof Error ? error.message : "Error al guardar el cuadre";
    return NextResponse.json({ message }, { status: 400 });
  }
}

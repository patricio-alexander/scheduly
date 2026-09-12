import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { toAmount } from "@/shared/utils/money";
import { personFullName } from "@/shared/utils/person-name";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 50;

function parsePage(value: string | null) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parsePageSize(value: string | null) {
  const size = Number(value ?? DEFAULT_PAGE_SIZE);
  if (!Number.isInteger(size) || size <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(size, MAX_PAGE_SIZE);
}

function registrarName(account: {
  username: string | null;
  person: {
    firstName: string | null;
    firstLastName: string | null;
    secondName?: string | null;
    secondLastName?: string | null;
  } | null;
}) {
  const fromPerson = personFullName(account.person);
  if (fromPerson && fromPerson !== "—") return fromPerson;
  return account.username?.trim() || "—";
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const period = parseDashboardPeriod(url.searchParams.get("period"));
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const page = parsePage(url.searchParams.get("page"));
    const pageSize = parsePageSize(url.searchParams.get("pageSize"));
    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const { start, end } = getDashboardPeriodRange(period);

    const scope = await resolveDashboardScope(
      prisma,
      auth.user,
      requestedBranchId,
    );
    const branchId = scope.branchId;

    const payments = await prisma.employeePayment.findMany({
      where: {
        paidAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            secondName: true,
            firstLastName: true,
            secondLastName: true,
          },
        },
        registeredBy: {
          select: {
            id: true,
            username: true,
            person: {
              select: {
                firstName: true,
                firstLastName: true,
                secondName: true,
                secondLastName: true,
              },
            },
          },
        },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    const mapped = payments.map((payment) => ({
      id: payment.id,
      userId: payment.userId,
      employeeName: personFullName(payment.person),
      amount: toAmount(payment.amount),
      method: payment.method,
      paidAt: payment.paidAt.toISOString(),
      notes: payment.notes ?? "",
      branchName: payment.branch?.name ?? null,
      registeredBy: {
        id: payment.registeredBy.id,
        name: registrarName(payment.registeredBy),
      },
    }));

    const filtered = q
      ? mapped.filter((payment) => {
          const haystack = [
            payment.employeeName,
            payment.registeredBy.name,
            payment.notes,
            payment.branchName ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        })
      : mapped;

    const totalCount = filtered.length;
    const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0);
    const startIdx = (page - 1) * pageSize;
    const items = filtered.slice(startIdx, startIdx + pageSize);

    return NextResponse.json({
      period,
      branchId,
      page,
      pageSize,
      totalCount,
      totalAmount,
      items,
    });
  } catch (error) {
    console.error("GET /api/finance/payroll/history", error);
    return NextResponse.json(
      { message: "Error al obtener historial" },
      { status: 500 },
    );
  }
}

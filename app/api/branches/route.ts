import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole, isBranchAdminRole } from "@/shared/utils/roles";
import {
  countAccountsByBranch,
  ensureAccountBranchTable,
  getAccountPrimaryBranchId,
  listAccountsForBranch,
} from "@/shared/utils/account-branch";

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    await ensureAccountBranchTable(prisma);

    const withTeam =
      new URL(request.url).searchParams.get("withTeam") === "1";

    let branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            appointments: true,
            stocks: true,
          },
        },
      },
    });

    // Administrador: solo su local
    if (isBranchAdminRole(auth.user.role) && !isOwnerRole(auth.user.role)) {
      const myBranchId = await getAccountPrimaryBranchId(prisma, auth.user.id);
      branches = myBranchId
        ? branches.filter((b) => b.id === myBranchId)
        : [];
    }

    const payload = await Promise.all(
      branches.map(async (b, idx) => {
        const teamCount = await countAccountsByBranch(prisma, b.id);
        const base = {
          ...b,
          code: b.establishmentCode || `suc-${b.id}`,
          locationKind: b.locationKind,
          isMain: idx === 0 || b.locationKind === "propia",
          sortOrder: b.position,
          teamCount,
        };

        if (!withTeam || !isOwnerRole(auth.user.role)) return base;

        const team = await listAccountsForBranch(prisma, b.id);
        return {
          ...base,
          team: team.map((t) => ({
            id: t.accountId,
            username: t.username ?? "",
            name: [t.firstName, t.firstLastName].filter(Boolean).join(" ") || t.username || "—",
            role: t.roleName ?? "Empleado",
            isActive: Boolean(t.isActive),
            isPrimary: Boolean(t.isPrimary),
          })),
        };
      }),
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/branches", error);
    return NextResponse.json(
      { message: "Error al obtener sucursales" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }

    const maxPos = await prisma.branch.aggregate({ _max: { position: true } });
    const nextPos = (maxPos._max.position ?? 0) + 1;

    const branch = await prisma.branch.create({
      data: {
        name,
        address: String(body.address ?? "").trim() || "—",
        phone: String(body.phone ?? "").trim() || null,
        city: String(body.city ?? "Loja").trim() || "Loja",
        province: String(body.province ?? "Loja").trim() || "Loja",
        isActive: body.isActive !== false,
        isVisible: true,
        position: Number(body.sortOrder ?? body.position ?? nextPos) || nextPos,
        locationKind:
          body.locationKind === "vitrina" || body.locationKind === "bodega"
            ? body.locationKind
            : "propia",
        establishmentCode: String(body.code ?? String(nextPos).padStart(3, "0")).slice(
          0,
          3,
        ),
        createdBy: auth.user.id,
      },
    });

    await prisma.cashRegister.create({
      data: {
        storeId: branch.id,
        name: `Caja ${branch.name}`,
        code: `C${branch.id}`,
        emissionPointCode: "001",
        isActive: true,
        position: 1,
      },
    });

    return NextResponse.json(
      {
        ...branch,
        code: branch.establishmentCode,
        isMain: branch.locationKind === "propia",
        sortOrder: branch.position,
        teamCount: 0,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/branches", error);
    return NextResponse.json(
      { message: "Error al crear sucursal" },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { personDisplayName, splitPersonName } from "@/shared/utils/account-serialize";

/**
 * Perfil del usuario autenticado (Account + Person + PersonData).
 * GET/PUT ?userId=  → solo la propia cuenta (o Dueña puede leer cualquiera).
 */

function canAccessProfile(
  authUserId: number,
  authRole: string,
  targetAccountId: number,
) {
  if (authUserId === targetAccountId) return true;
  const role = String(authRole).toLowerCase();
  return role === "owner" || role === "dueño" || role === "dueno";
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const userIdRaw = url.searchParams.get("userId");
    const accountId = userIdRaw ? Number(userIdRaw) : auth.user.id;

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ message: "userId inválido" }, { status: 400 });
    }

    if (!canAccessProfile(auth.user.id, auth.user.role, accountId)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        person: true,
        roles: { include: { role: true }, orderBy: { id: "asc" } },
      },
    });
    if (!account) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const personData = account.userId
      ? await prisma.personData.findUnique({ where: { idUser: account.userId } })
      : null;

    return NextResponse.json({
      id: account.id,
      personId: account.userId,
      username: account.username,
      name: personDisplayName(account.person),
      email:
        personData?.personalEmail ??
        personData?.institutionalEmail ??
        "",
      phone: personData?.cellPhone ?? personData?.phone ?? "",
      bio: null,
      photo: account.person?.photo ?? null,
      role: auth.user.role,
      firstName: account.person?.firstName ?? "",
      firstLastName: account.person?.firstLastName ?? "",
      secondName: account.person?.secondName ?? "",
      secondLastName: account.person?.secondLastName ?? "",
    });
  } catch (error) {
    console.error("GET /api/profile", error);
    return NextResponse.json(
      { message: "Error al obtener perfil" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const userIdRaw = url.searchParams.get("userId");
    const accountId = userIdRaw ? Number(userIdRaw) : auth.user.id;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ message: "userId inválido" }, { status: 400 });
    }

    // Solo puede editar su propio perfil
    if (auth.user.id !== accountId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { person: true },
    });
    if (!account?.userId) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const name =
      body.name != null
        ? String(body.name).trim()
        : personDisplayName(account.person);
    const { firstName, firstLastName } = splitPersonName(name);
    const email =
      body.email != null ? String(body.email).trim() : undefined;
    const phone =
      body.phone != null ? String(body.phone).trim() : undefined;

    await prisma.person.update({
      where: { id: account.userId },
      data: {
        firstName:
          body.firstName != null
            ? String(body.firstName).trim()
            : firstName,
        firstLastName:
          body.firstLastName != null
            ? String(body.firstLastName).trim()
            : firstLastName,
        secondName:
          body.secondName != null
            ? String(body.secondName).trim() || null
            : undefined,
        secondLastName:
          body.secondLastName != null
            ? String(body.secondLastName).trim() || null
            : undefined,
      },
    });

    if (email !== undefined || phone !== undefined) {
      await prisma.personData.upsert({
        where: { idUser: account.userId },
        create: {
          idUser: account.userId,
          personalEmail: email ?? "",
          cellPhone: phone ?? null,
          phone: phone ?? null,
        },
        update: {
          ...(email !== undefined ? { personalEmail: email } : {}),
          ...(phone !== undefined
            ? { cellPhone: phone, phone }
            : {}),
        },
      });
    }

    const updated = await prisma.account.findUnique({
      where: { id: accountId },
      include: { person: true },
    });
    const personData = updated?.userId
      ? await prisma.personData.findUnique({
          where: { idUser: updated.userId },
        })
      : null;

    return NextResponse.json({
      id: accountId,
      personId: updated?.userId ?? null,
      username: updated?.username,
      name: personDisplayName(updated?.person ?? null),
      email:
        personData?.personalEmail ??
        personData?.institutionalEmail ??
        "",
      phone: personData?.cellPhone ?? personData?.phone ?? "",
      photo: updated?.person?.photo ?? null,
      role: auth.user.role,
    });
  } catch (error) {
    console.error("PUT /api/profile", error);
    return NextResponse.json(
      { message: "Error al actualizar perfil" },
      { status: 500 },
    );
  }
}

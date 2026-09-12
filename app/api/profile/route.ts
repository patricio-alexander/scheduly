import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { personDisplayName, splitPersonName } from "@/shared/utils/account-serialize";
import {
  clearPersonPhoto,
  savePersonPhoto,
} from "@/shared/utils/profile-photo";

/**
 * Perfil del usuario autenticado (Account + Person + PersonData).
 * GET/PUT ?userId=  → solo la propia cuenta (o Dueña puede leer cualquiera).
 * PUT soporta JSON o multipart (campo photo) para foto de perfil.
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

function serializeProfile(
  account: {
    id: number;
    username: string | null;
    userId: number | null;
    person: {
      firstName: string | null;
      firstLastName: string | null;
      secondName: string | null;
      secondLastName: string | null;
      birthday: Date | null;
      gender: string | null;
      photo: string | null;
    } | null;
  },
  personData: {
    personalEmail: string | null;
    institutionalEmail: string | null;
    cellPhone: string | null;
    phone: string | null;
    bloodType: string | null;
    placeResidence: string | null;
    direction: string | null;
  } | null,
  role: string,
) {
  return {
    id: account.id,
    personId: account.userId,
    username: account.username,
    name: personDisplayName(account.person),
    email:
      personData?.personalEmail ??
      personData?.institutionalEmail ??
      "",
    phone: personData?.cellPhone ?? personData?.phone ?? "",
    bio: null as string | null,
    photo: account.person?.photo ?? null,
    role,
    firstName: account.person?.firstName ?? "",
    firstLastName: account.person?.firstLastName ?? "",
    secondName: account.person?.secondName ?? "",
    secondLastName: account.person?.secondLastName ?? "",
    birthday: account.person?.birthday
      ? account.person.birthday.toISOString().slice(0, 10)
      : null,
    gender: account.person?.gender ?? null,
    bloodType: personData?.bloodType ?? null,
    placeResidence: personData?.placeResidence ?? null,
    direction: personData?.direction ?? null,
  };
}

async function loadSerialized(accountId: number, role: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      person: true,
      roles: { include: { role: true }, orderBy: { id: "asc" } },
    },
  });
  if (!account) return null;
  const personData = account.userId
    ? await prisma.personData.findUnique({ where: { idUser: account.userId } })
    : null;
  return serializeProfile(account, personData, role);
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

    const profile = await loadSerialized(accountId, auth.user.role);
    if (!profile) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }
    return NextResponse.json(profile);
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

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ message: "userId inválido" }, { status: 400 });
    }

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

    const contentType = request.headers.get("content-type") ?? "";
    let body: Record<string, unknown> = {};
    let photoFile: File | null = null;
    let removePhoto = false;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      removePhoto = String(form.get("removePhoto") ?? "") === "1";
      const rawPhoto = form.get("photo");
      if (rawPhoto instanceof File && rawPhoto.size > 0) {
        photoFile = rawPhoto;
      }
      for (const key of [
        "name",
        "email",
        "phone",
        "birthday",
        "gender",
        "bloodType",
        "placeResidence",
        "direction",
        "firstName",
        "firstLastName",
        "secondName",
        "secondLastName",
      ]) {
        if (form.has(key)) body[key] = String(form.get(key) ?? "");
      }
    } else {
      body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (body.removePhoto === true || body.removePhoto === "1") {
        removePhoto = true;
      }
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
    const bloodType =
      body.bloodType != null ? String(body.bloodType).trim() || null : undefined;
    const placeResidence =
      body.placeResidence != null
        ? String(body.placeResidence).trim() || null
        : undefined;
    const direction =
      body.direction != null
        ? String(body.direction).trim() || null
        : undefined;
    const gender =
      body.gender != null ? String(body.gender).trim() || null : undefined;

    let birthday: Date | null | undefined = undefined;
    if (body.birthday !== undefined) {
      const raw = String(body.birthday ?? "").trim();
      if (!raw) birthday = null;
      else {
        const d = new Date(raw);
        birthday = Number.isNaN(d.getTime()) ? null : d;
      }
    }

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
        ...(gender !== undefined ? { gender } : {}),
        ...(birthday !== undefined ? { birthday } : {}),
      },
    });

    const touchPersonData =
      email !== undefined ||
      phone !== undefined ||
      bloodType !== undefined ||
      placeResidence !== undefined ||
      direction !== undefined;

    if (touchPersonData) {
      await prisma.personData.upsert({
        where: { idUser: account.userId },
        create: {
          idUser: account.userId,
          personalEmail: email ?? "",
          cellPhone: phone ?? null,
          phone: phone ?? null,
          bloodType: bloodType ?? null,
          placeResidence: placeResidence ?? null,
          direction: direction ?? null,
        },
        update: {
          ...(email !== undefined ? { personalEmail: email } : {}),
          ...(phone !== undefined ? { cellPhone: phone, phone } : {}),
          ...(bloodType !== undefined ? { bloodType } : {}),
          ...(placeResidence !== undefined ? { placeResidence } : {}),
          ...(direction !== undefined ? { direction } : {}),
        },
      });
    }

    if (removePhoto) {
      await clearPersonPhoto(account.userId, account.person?.photo);
    } else if (photoFile) {
      await savePersonPhoto(
        account.userId,
        photoFile,
        account.person?.photo,
      );
    }

    const profile = await loadSerialized(accountId, auth.user.role);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("PUT /api/profile", error);
    const message =
      error instanceof Error ? error.message : "Error al actualizar perfil";
    return NextResponse.json({ message }, { status: 400 });
  }
}

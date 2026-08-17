import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { parseRewardBody, rewardApplyInclude } from "@/shared/utils/reward-apply";
import { isManagementRole } from "@/shared/utils/roles";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const rewards = await prisma.reward.findMany({
      orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }],
      include: rewardApplyInclude,
    });
    return NextResponse.json(rewards);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener premios" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data = parseRewardBody(body);
    const reward = await prisma.reward.create({
      data,
      include: rewardApplyInclude,
    });
    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear el premio";
    return NextResponse.json({ message }, { status: 400 });
  }
}

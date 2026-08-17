import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { parseRewardBody, rewardApplyInclude } from "@/shared/utils/reward-apply";
import { isManagementRole } from "@/shared/utils/roles";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data = parseRewardBody(body);
    const reward = await prisma.reward.update({
      where: { id: Number(id) },
      data,
      include: rewardApplyInclude,
    });
    return NextResponse.json(reward);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al actualizar el premio";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.reward.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Premio eliminado" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar el premio" },
      { status: 500 },
    );
  }
}

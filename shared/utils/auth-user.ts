import type { PrismaClient } from "@/generated/prisma/client";
import { getUserBranchSummary } from "@/shared/utils/branches";

export type AuthUserBranch = {
  id: number;
  name: string;
  code: string;
};

export type AuthUserPayload = {
  id: number;
  name: string;
  email: string;
  role: string;
  photo: string | null;
  branch: AuthUserBranch | null;
};

type Db = Pick<PrismaClient, "user">;

export async function serializeAuthUser(
  db: Db & Parameters<typeof getUserBranchSummary>[0],
  userId: number,
): Promise<AuthUserPayload | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      photo: true,
    },
  });

  if (!user) return null;

  const branchRow = await getUserBranchSummary(db, userId);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    photo: user.photo ?? null,
    branch: branchRow
      ? { id: branchRow.id, name: branchRow.name, code: branchRow.code }
      : null,
  };
}

export function branchDisplayLabel(
  branch: AuthUserBranch | null | undefined,
  _role?: string | null,
): string | null {
  return branch?.name ?? null;
}

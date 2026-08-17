import type { AuthUserBranch } from "@/shared/utils/auth-user";

export interface AuthUser {
  username?: string;
  id: number;
  name: string;
  email: string;
  role: string;
  photo: string | null;
  branch: AuthUserBranch | null;
}

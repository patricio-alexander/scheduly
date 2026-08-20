import type { AuthUserBranch } from "@/shared/utils/auth-user";

export interface AuthUserRole {
  id: number;
  name: string;
  label: string;
}

export interface AuthUser {
  username?: string;
  id: number;
  /** Person.id (notificaciones / turnos EdDeli) */
  personId?: number | null;
  name: string;
  email: string;
  role: string;
  rolId?: number | null;
  roles?: AuthUserRole[];
  photo: string | null;
  branch: AuthUserBranch | null;
}

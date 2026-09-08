import { redirect } from "next/navigation";
import { appRoutes } from "@/shared/utils/app-routes";

/** Usuarios → Cuentas (una persona = una cuenta, multi-rol). */
export default function UsersRedirectPage() {
  redirect(appRoutes.admin.accounts);
}

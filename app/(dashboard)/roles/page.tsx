import { redirect } from "next/navigation";

export default function LegacyRolesRedirect() {
  redirect("/administracion/roles");
}

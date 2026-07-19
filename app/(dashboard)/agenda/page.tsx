import { redirect } from "next/navigation";

export default function LegacyAgendaRedirect() {
  redirect("/operacion/agenda");
}

import { redirect } from "next/navigation";

export default function LegacyCustomersRedirect() {
  redirect("/ventas/clientes");
}

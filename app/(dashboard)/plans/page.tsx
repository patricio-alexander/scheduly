import { redirect } from "next/navigation";

export default function LegacyPlansRedirect() {
  redirect("/sistema/planes");
}

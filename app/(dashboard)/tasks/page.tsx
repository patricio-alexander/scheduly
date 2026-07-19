import { redirect } from "next/navigation";

export default function LegacyTasksRedirect() {
  redirect("/operacion/tareas");
}

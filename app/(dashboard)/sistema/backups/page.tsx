import { redirect } from "next/navigation";
import { appRoutes } from "@/shared/utils/app-routes";

/** Backups vive en Configuración → pestaña Backups (solo Dueño). */
export default function BackupsPage() {
  redirect(`${appRoutes.system.settings}?tab=backups`);
}

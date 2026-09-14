import { redirect } from "next/navigation";
import { appRoutes } from "@/shared/utils/app-routes";

export default function CashClosePage() {
  redirect(appRoutes.operation.shifts);
}

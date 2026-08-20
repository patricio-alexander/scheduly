import { redirect } from "next/navigation";
import { appRoutes } from "@/shared/utils/app-routes";

export default function PurchaseHistoryRedirectPage() {
  redirect(appRoutes.purchases.hub);
}

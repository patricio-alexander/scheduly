import { redirect } from "next/navigation";
import { appRoutes } from "@/shared/utils/app-routes";

export default function LegacyLoyaltyRedirect() {
  redirect(appRoutes.loyalty.hub);
}

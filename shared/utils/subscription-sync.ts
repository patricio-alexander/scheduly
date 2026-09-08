/**
 * Catálogo local de planes/módulos (Scheduly standalone).
 * Sin llamadas HTTP al Gestor.
 */
import { APP_MODULE_CATALOG } from "@/shared/utils/app-modules-catalog";
import { buildDevOpenSubscriptionState } from "@/shared/utils/dev-subscription";
import type { Prisma } from "@/generated/prisma/client";
import type {
  SubscriptionPlan,
  SubscriptionCatalogModule,
} from "@/shared/utils/subscription-plans";

export type {
  SubscriptionPlan,
  SubscriptionPlanModule,
  SubscriptionPlanSection,
  SubscriptionPlanPrice,
  SubscriptionPlanOffer,
  SubscriptionCatalogModule,
} from "@/shared/utils/subscription-plans";

/** @deprecated Compat: ya no hay Bearer externo. */
export function isValidGestorBearer(_request: Request) {
  return false;
}

/** Estado local abierto (todos los módulos active). */
export async function pullLocalOpenSubscription(): Promise<Prisma.InputJsonValue> {
  return buildDevOpenSubscriptionState() as unknown as Prisma.InputJsonValue;
}

/** @deprecated Usar pullLocalOpenSubscription */
export const pullSubscriptionFromGestor = pullLocalOpenSubscription;

/** Planes comerciales: no aplica en standalone. */
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return [];
}

/** Módulos desde el catálogo local de la app. */
export async function fetchSubscriptionModules(): Promise<
  SubscriptionCatalogModule[]
> {
  return APP_MODULE_CATALOG.map((group, index) => ({
    id: index + 1,
    key: group.entitlementKey,
    name: group.label,
    description: group.summary,
    status: "active",
    image_url: null,
  }));
}

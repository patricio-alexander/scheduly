import { APP_MODULE_CATALOG } from "@/shared/utils/app-modules-catalog";
import type { SubscriptionState } from "@/src/features/subscription/types";

/** Entitlement “todo activo” para Scheduly standalone. */
export function buildDevOpenSubscriptionState(): SubscriptionState {
  const byKey = new Map<
    string,
    NonNullable<SubscriptionState["subscription"]>["modules"][number]
  >();

  let moduleId = 1;
  let sectionId = 1;

  for (const group of APP_MODULE_CATALOG) {
    const key = group.entitlementKey;
    let mod = byKey.get(key);
    if (!mod) {
      mod = {
        id: moduleId++,
        name: group.label,
        key,
        status: "active",
        is_maintainer: false,
        image_url: null,
        is_trial: false,
        start_trial: null,
        limit_days_trial: null,
        end_trial: null,
        sections: [],
      };
      byKey.set(key, mod);
    }
    for (const section of group.sections) {
      mod.sections.push({
        id: sectionId++,
        key: section.path,
        name: section.name,
        status: "active",
        max_records_limit: null,
        usage_count: 0,
        capabilities: [],
      });
    }
  }

  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 10);

  return {
    maintenance: false,
    subscribed: true,
    subscription: {
      id: 0,
      plan_name: "Desarrollo local",
      period: "YEARLY",
      status: "ACTIVE",
      start_at: new Date().toISOString(),
      expires_at: expires.toISOString(),
      modules: [...byKey.values()],
    },
  };
}

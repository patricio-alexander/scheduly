"use client";

import type { ReactNode } from "react";

/** Pass-through: Scheduly ya no bloquea por suscripción del Gestor. */
export function SubscriptionGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

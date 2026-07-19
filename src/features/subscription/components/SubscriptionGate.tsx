"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { LayoutSkeleton } from "@/shared/components/ui";
import { useSubscription } from "../hooks/useSubscription";
import { AccessStateScreen } from "./AccessStateScreen";

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, syncing, error, syncPull, resolvePathAccess } = useSubscription();

  if (loading) {
    return <LayoutSkeleton />;
  }

  const access = resolvePathAccess(pathname);
  if (access.kind !== "ok") {
    return (
      <AccessStateScreen
        kind={access.kind}
        title={access.title}
        description={access.description}
        error={access.kind === "unsubscribed" ? error : null}
        action={
          access.kind === "unsubscribed" ? (
            <Button
              variant="primary"
              isDisabled={syncing}
              onPress={() => {
                void syncPull();
              }}
            >
              {syncing ? "Verificando..." : "Probar nuevamente"}
            </Button>
          ) : null
        }
      />
    );
  }

  return <>{children}</>;
}

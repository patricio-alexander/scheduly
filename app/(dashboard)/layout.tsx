"use client";

import { useAuth } from "@/src/features/auth";
import { OnboardingRoot } from "@/src/features/onboarding";
import { SubscriptionProvider } from "@/src/features/subscription";
import { DashboardShell } from "@/shared/components/DashboardShell";
import { LayoutSkeleton } from "@/shared/components/ui";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  isEmployeeRole,
  isManagementRole,
  isOwnerRole,
  isProgrammerAllowedPath,
  isProgrammerRole,
} from "@/shared/utils/roles";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function isEmployeeBlockedPath(pathname: string) {
  if (pathname.startsWith(appRoutes.loyalty.hub)) return true;
  if (pathname.startsWith(appRoutes.sales.history)) return true;
  if (pathname.startsWith(appRoutes.sales.register)) return true;
  if (pathname.startsWith(appRoutes.inventory.categories)) return true;
  if (pathname.startsWith("/compras")) return true;
  if (pathname.startsWith("/finanzas")) return true;
  if (pathname.startsWith("/administracion/sucursales")) return true;
  if (pathname.startsWith("/canal")) return true;
  if (pathname.startsWith("/produccion")) return true;
  if (pathname.startsWith("/marketing")) return true;
  if (pathname.startsWith("/publicidad")) return true;
  if (pathname.startsWith("/diseno-promocional")) return true;
  if (pathname.startsWith("/comprobantes-electronicos")) return true;
  if (pathname.startsWith("/administracion")) return true;
  if (pathname.startsWith("/sistema")) {
    return (
      pathname !== appRoutes.system.profile &&
      !pathname.startsWith(`${appRoutes.system.profile}/`)
    );
  }
  return false;
}

function isOwnerOnlyPath(pathname: string) {
  if (pathname.startsWith(appRoutes.purchases.suppliers)) return true;
  if (pathname.startsWith("/comprobantes-electronicos")) return true;
  if (pathname.startsWith("/administracion")) return true;
  if (pathname.startsWith(appRoutes.sales.history)) return true;
  if (pathname.startsWith("/sistema")) {
    return (
      pathname !== appRoutes.system.profile &&
      !pathname.startsWith(`${appRoutes.system.profile}/`) &&
      !isProgrammerAllowedPath(pathname)
    );
  }
  return false;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(appRoutes.login);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user) return;
    if (isProgrammerRole(user.role)) {
      if (!isProgrammerAllowedPath(pathname)) {
        router.replace(appRoutes.system.logs);
      }
      return;
    }
    if (isEmployeeRole(user.role) && isEmployeeBlockedPath(pathname)) {
      router.replace(appRoutes.operation.tasks);
      return;
    }
    if (
      isManagementRole(user.role) &&
      !isOwnerRole(user.role) &&
      isOwnerOnlyPath(pathname)
    ) {
      router.replace(appRoutes.dashboard);
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <LayoutSkeleton />;
  }

  if (!user) return null;

  if (isProgrammerRole(user.role) && !isProgrammerAllowedPath(pathname)) {
    return null;
  }

  if (isEmployeeRole(user.role) && isEmployeeBlockedPath(pathname)) {
    return null;
  }

  if (
    isManagementRole(user.role) &&
    !isOwnerRole(user.role) &&
    isOwnerOnlyPath(pathname)
  ) {
    return null;
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SubscriptionProvider>
        <OnboardingRoot>
          <DashboardShell>{children}</DashboardShell>
        </OnboardingRoot>
      </SubscriptionProvider>
    </AuthGuard>
  );
}

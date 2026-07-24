"use client";

import { useAuth } from "@/src/features/auth";
import { UnreadNotificationsFloat } from "@/src/features/notifications";
import { OnboardingRoot } from "@/src/features/onboarding";
import {
  SubscriptionProvider,
  SubscriptionGate,
} from "@/src/features/subscription";
import { Sidebar } from "@/shared/components/Sidebar";
import { LayoutSkeleton } from "@/shared/components/ui";
import { appRoutes } from "@/shared/utils/app-routes";
import { isAdminRole } from "@/shared/utils/roles";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function isEmployeeBlockedPath(pathname: string) {
  if (pathname.startsWith(appRoutes.sales.history)) return true;
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

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user) return;
    if (!isAdminRole(user.role) && isEmployeeBlockedPath(pathname)) {
      router.replace(appRoutes.operation.tasks);
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <LayoutSkeleton />;
  }

  if (!user) return null;

  if (!isAdminRole(user.role) && isEmployeeBlockedPath(pathname)) {
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
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 min-h-0 overflow-y-auto bg-background p-4 sm:p-5 md:p-6 lg:p-8">
              <SubscriptionGate>{children}</SubscriptionGate>
            </main>
            <UnreadNotificationsFloat />
          </div>
        </OnboardingRoot>
      </SubscriptionProvider>
    </AuthGuard>
  );
}

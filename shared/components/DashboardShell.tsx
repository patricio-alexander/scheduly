"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader, SIDEBAR_COLLAPSED_KEY } from "@/shared/components/AppHeader";
import { Sidebar } from "@/shared/components/Sidebar";
import { appRoutes } from "@/shared/utils/app-routes";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const compactMain = pathname.startsWith(appRoutes.operation.cash);
  const mainPad = compactMain
    ? "p-2 sm:p-2.5 md:p-3"
    : "p-4 sm:p-5 md:p-6 lg:p-8";
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) setCollapsed(stored === "true");
    setReady(true);
  }, []);

  useEffect(() => {
    const onExpand = () => {
      setCollapsed(false);
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "false");
    };
    window.addEventListener("scheduly:onboarding-expand", onExpand);
    return () => {
      window.removeEventListener("scheduly:onboarding-expand", onExpand);
    };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  if (!ready) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <div className="h-14 border-b border-separator bg-surface" />
        <div className="flex min-h-0 flex-1">
          <div className="w-64 border-r border-separator bg-surface" />
          <main className={`dashboard-main flex-1 min-h-0 overflow-y-auto bg-background ${mainPad}`}>
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <Sidebar collapsed={collapsed} />
        </Suspense>
        <main className={`dashboard-main flex-1 min-h-0 overflow-y-auto bg-background ${mainPad}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

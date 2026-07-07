"use client";

import { useAuth } from "@/src/features/auth";
import { Sidebar } from "@/shared/components/Sidebar";
import { LayoutSkeleton } from "@/shared/components/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <LayoutSkeleton />;
  }

  if (!user) return null;

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 bg-background">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

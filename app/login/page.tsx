"use client";

import { useAuth } from "@/src/features/auth";
import { LoginForm } from "@/src/features/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Calendar from "@gravity-ui/icons/Calendar";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Cargando...</p>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--accent)_0%,_transparent_60%)]">
      <div className="bg-surface rounded-2xl border border-separator shadow-xl p-8 w-full max-w-sm mx-4">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="bg-accent/10 rounded-xl p-3">
            <Calendar width={28} height={28} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold">Scheduly</h1>
          <p className="text-muted text-sm text-center">
            Ingresa tus credenciales para acceder
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

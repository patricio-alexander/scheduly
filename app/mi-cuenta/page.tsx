"use client";

import Link from "next/link";
import { PublicShell } from "@/shared/components/PublicShell";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  CustomerAccountPanel,
  CustomerLoginForm,
  useCustomerAuth,
} from "@/src/features/loyalty";

export default function CustomerLoginPage() {
  const { customer, loading, logout } = useCustomerAuth();

  if (loading) {
    return (
      <PublicShell>
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
          <div className="h-40 animate-pulse rounded-2xl bg-surface-secondary" />
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
          <p className="mt-1 text-sm text-muted">
            Inicia sesión para ver tus puntos, canjear premios y reservar turnos
          </p>
        </header>

        {customer ? (
          <CustomerAccountPanel onLogout={() => void logout()} />
        ) : (
          <>
            <div className="rounded-2xl border border-separator bg-surface p-5">
              <CustomerLoginForm />
            </div>
            <p className="text-center text-sm text-muted">
              ¿Primera vez? Pide al local que active tu cuenta con tu correo registrado.
            </p>
          </>
        )}

        <div className="flex justify-center gap-4 text-sm">
          <Link href={appRoutes.loyalty.feed} className="text-accent hover:underline">
            Novedades
          </Link>
          <Link href={appRoutes.booking} className="text-accent hover:underline">
            Reservar turno
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}

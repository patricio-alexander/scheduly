"use client";

import { PublicShell } from "@/shared/components/PublicShell";
import {
  CustomerAccountPanel,
  CustomerLoginForm,
  CustomerPublicDashboard,
  useCustomerAuth,
} from "@/src/features/loyalty";

export default function CustomerLoginPage() {
  const { customer, loading } = useCustomerAuth();

  return (
    <PublicShell active="account">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          <CustomerPublicDashboard
            active="account"
            title={
              customer ? `Hola, ${customer.name.split(" ")[0]}` : "Mi cuenta"
            }
            subtitle={
              customer
                ? "Elige una opción para continuar. Tus puntos y premios están a un lado."
                : "Elige una opción para continuar. Ingresa si quieres ver puntos y premios."
            }
          />
        </div>

        <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-t border-separator bg-surface p-5 lg:w-[26rem] lg:border-l lg:border-t-0 lg:p-6">
          {loading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-surface-secondary" />
          ) : customer ? (
            <CustomerAccountPanel />
          ) : (
            <>
              <h2 className="text-lg font-semibold">Ingresar</h2>
              <p className="mt-1 mb-5 text-sm text-muted">
                Correo o cédula y la clave registrada en el local.
              </p>
              <CustomerLoginForm />
              <p className="mt-5 rounded-2xl bg-surface-secondary px-4 py-3 text-sm text-muted">
                ¿Primera vez? Pide al local que active tu cuenta con tu correo
                registrado.
              </p>
            </>
          )}
        </aside>
      </div>
    </PublicShell>
  );
}

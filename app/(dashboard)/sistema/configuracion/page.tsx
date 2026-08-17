"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Gear from "@gravity-ui/icons/Gear";
import Shield from "@gravity-ui/icons/Shield";
import {
  BusinessSettingsForm,
  SriCertificateForm,
  InvoicePreview,
} from "@/src/features/settings";
import { appRoutes } from "@/shared/utils/app-routes";

function SettingsContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "sri" ? "sri" : "negocio";
  const [sriEnv, setSriEnv] = useState<"pruebas" | "produccion">("pruebas");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-muted">
          <Gear width={18} height={18} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Sistema
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted">
          Datos del negocio, apariencia y firma electrónica SRI.
        </p>
      </header>

      <div className="flex gap-2 border-b border-separator">
        <Link
          href={appRoutes.system.settings}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "negocio"
              ? "border-accent text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Negocio
        </Link>
        <Link
          href={`${appRoutes.system.settings}?tab=sri`}
          className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "sri"
              ? "border-accent text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Shield width={14} height={14} />
          Firma SRI
        </Link>
      </div>

      {tab === "sri" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-separator bg-surface p-5 sm:p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">
              Certificado de firma electrónica
            </h2>
            <SriCertificateForm onEnvironmentChange={setSriEnv} />
          </section>
          <section className="rounded-2xl border border-separator bg-surface p-5 sm:p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">
              Cómo se ve la factura
            </h2>
            <InvoicePreview environment={sriEnv} />
          </section>
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-separator bg-surface p-5 sm:p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">
              Negocio y apariencia
            </h2>
            <BusinessSettingsForm />
          </section>
          <section className="rounded-2xl border border-separator bg-surface p-5 sm:p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">
              Cómo se ve la factura
            </h2>
            <InvoicePreview />
            <p className="mt-3 text-xs text-muted">
              Usa el nombre, logo y dirección del negocio. Guarda los cambios
              para actualizar la vista.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-40 animate-pulse rounded-2xl bg-surface-secondary" />
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

"use client";

import { BusinessSettingsForm } from "@/src/features/settings";
import Gear from "@gravity-ui/icons/Gear";

export default function SettingsPage() {
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
          Datos del negocio, marca y colores del sistema.
        </p>
      </header>

      <section className="rounded-2xl border border-separator bg-surface p-5 sm:p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">
          Negocio y apariencia
        </h2>
        <BusinessSettingsForm />
      </section>
    </div>
  );
}

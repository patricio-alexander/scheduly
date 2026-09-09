"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import Gear from "@gravity-ui/icons/Gear";
import Shield from "@gravity-ui/icons/Shield";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import Receipt from "@gravity-ui/icons/Receipt";
import Layers from "@gravity-ui/icons/Layers";
import House from "@gravity-ui/icons/House";
import Database from "@gravity-ui/icons/Database";
import {
  BusinessSettingsForm,
  SriCertificateForm,
  InvoicePreview,
  MultiBranchSettingsPanel,
  OperationFlagsPanel,
} from "@/src/features/settings";
import { BackupsManager } from "@/src/features/backups";
import { SettingsTutorialGate, type SettingsTabId } from "@/src/features/tutorials";
import { useAuth } from "@/src/features/auth";
import { isOwnerRole, isProgrammerRole } from "@/shared/utils/roles";
import { appRoutes } from "@/shared/utils/app-routes";

const BASE_TABS = [
  { id: "marca" as const, label: "Marca", href: appRoutes.system.settings },
  {
    id: "sistema" as const,
    label: "Sistema",
    href: `${appRoutes.system.settings}?tab=sistema`,
  },
  {
    id: "inventario" as const,
    label: "Inventario",
    href: `${appRoutes.system.settings}?tab=inventario`,
  },
  {
    id: "comprobantes" as const,
    label: "Comprobantes",
    href: `${appRoutes.system.settings}?tab=comprobantes`,
  },
  {
    id: "publico" as const,
    label: "Público",
    href: `${appRoutes.system.settings}?tab=publico`,
  },
  {
    id: "locales" as const,
    label: "Locales",
    href: `${appRoutes.system.settings}?tab=locales`,
  },
  {
    id: "sri" as const,
    label: "Facturación SRI",
    href: `${appRoutes.system.settings}?tab=sri`,
  },
];

const BACKUPS_TAB = {
  id: "backups" as const,
  label: "Backups",
  href: `${appRoutes.system.settings}?tab=backups`,
};

type TabId = SettingsTabId;

function SettingsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isProgrammer = isProgrammerRole(user?.role);
  const canManageBackups = isOwnerRole(user?.role) || isProgrammer;
  const [sriEnv, setSriEnv] = useState<"pruebas" | "produccion">("pruebas");
  const autoTutorial =
    searchParams.get("tutorial") === "1" ||
    searchParams.get("tutorial") === "settings";

  const tabs = useMemo(
    () => (canManageBackups ? [...BASE_TABS, BACKUPS_TAB] : [...BASE_TABS]),
    [canManageBackups],
  );

  const tabIds = useMemo(
    () => tabs.map((t) => t.id) as SettingsTabId[],
    [tabs],
  );

  function resolveTab(raw: string | null): TabId {
    if (raw === "negocio" || raw === "app" || !raw) return "marca";
    if (raw === "backups" && !canManageBackups) return "marca";
    if (tabs.some((t) => t.id === raw)) return raw as TabId;
    return "marca";
  }

  const tab = resolveTab(searchParams.get("tab"));

  return (
    <div className="flex flex-col gap-6">
      <header
        className="flex flex-col gap-1 pr-12 relative"
        data-tour="settings-header"
      >
        <div className="absolute top-0 right-0">
          <SettingsTutorialGate
            activeTab={tab}
            tabIds={tabIds}
            autoStartTabs={autoTutorial}
          />
        </div>
        <div className="flex items-center gap-2 text-muted">
          <Gear width={18} height={18} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Sistema
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted">
          Marca, inventario, comprobantes, canal público, locales
          {canManageBackups ? ", SRI y backups" : " y SRI"} — como EdDeli.
        </p>
      </header>

      <div
        className="flex flex-wrap gap-1 border-b border-separator"
        data-tour="settings-tabs"
      >
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              data-tour={`settings-tab-${item.id}`}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {item.id === "sri" ? <Shield width={14} height={14} /> : null}
              {item.id === "inventario" ? (
                <Boxes3 width={14} height={14} />
              ) : null}
              {item.id === "comprobantes" ? (
                <Receipt width={14} height={14} />
              ) : null}
              {item.id === "locales" ? <Layers width={14} height={14} /> : null}
              {item.id === "marca" ? <House width={14} height={14} /> : null}
              {item.id === "backups" ? (
                <Database width={14} height={14} />
              ) : null}
              {item.label}
            </Link>
          );
        })}
      </div>

      {tab === "sri" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <section
            className="rounded-2xl border border-separator bg-surface p-5 sm:p-6"
            data-tour="settings-sri-cert"
          >
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">
              Certificado de firma electrónica
            </h2>
            <SriCertificateForm onEnvironmentChange={setSriEnv} />
          </section>
          <section
            className="rounded-2xl border border-separator bg-surface p-5 sm:p-6"
            data-tour="settings-sri-preview"
          >
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">
              Cómo se ve la factura
            </h2>
            <InvoicePreview environment={sriEnv} />
          </section>
        </div>
      ) : null}

      {tab === "locales" ? (
        <div
          className="mx-auto w-full max-w-2xl"
          data-tour="settings-locales-panel"
        >
          <MultiBranchSettingsPanel />
        </div>
      ) : null}

      {tab === "marca" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <section
            className="rounded-2xl border border-separator bg-surface p-5 sm:p-6"
            data-tour="settings-marca-form"
          >
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted">
              Negocio y apariencia
            </h2>
            <BusinessSettingsForm />
          </section>
          <section
            className="rounded-2xl border border-separator bg-surface p-5 sm:p-6"
            data-tour="settings-marca-preview"
          >
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
      ) : null}

      {tab === "inventario" ||
      tab === "comprobantes" ||
      tab === "publico" ||
      tab === "sistema" ? (
        <div data-tour="settings-flags-panel">
          <OperationFlagsPanel tab={tab} />
        </div>
      ) : null}

      {tab === "backups" && canManageBackups ? (
        <div data-tour="settings-backups">
          <BackupsManager embedded />
        </div>
      ) : null}
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

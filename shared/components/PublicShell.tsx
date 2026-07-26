"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import Calendar from "@gravity-ui/icons/Calendar";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  DEFAULT_BUSINESS_NAME,
  type BusinessProfile,
} from "@/shared/utils/business-profile";

type PublicBusiness = Pick<
  BusinessProfile,
  "businessName" | "address" | "logoPath"
>;

export function PublicShell({
  children,
  active = "home",
}: {
  children: ReactNode;
  active?: "home" | "booking";
}) {
  const [business, setBusiness] = useState<PublicBusiness>({
    businessName: DEFAULT_BUSINESS_NAME,
    address: "",
    logoPath: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/settings"), { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as PublicBusiness | null;
        if (!cancelled && res.ok && json?.businessName) {
          setBusiness({
            businessName: json.businessName,
            address: json.address ?? "",
            logoPath: json.logoPath ?? null,
          });
        }
      } catch {
        // keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logoUrl = business.logoPath ? apiUrl(business.logoPath) : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -15%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="relative z-10 border-b border-separator/70 bg-surface/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href={appRoutes.home}
            className="flex min-w-0 items-center gap-2.5 text-foreground"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-9 w-9 rounded-xl object-contain bg-surface-secondary"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Calendar width={18} height={18} />
              </span>
            )}
            <span className="truncate text-lg font-bold tracking-tight">
              {business.businessName}
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href={appRoutes.booking}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                active === "booking"
                  ? "bg-accent/20 text-foreground"
                  : "text-muted hover:bg-surface-secondary hover:text-foreground"
              }`}
            >
              Reservar
            </Link>
            <Link
              href={appRoutes.login}
              className="rounded-xl border border-separator bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary"
            >
              Acceso equipo
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}

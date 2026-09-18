"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import ArrowChevronLeft from "@gravity-ui/icons/ArrowChevronLeft";
import Calendar from "@gravity-ui/icons/Calendar";
import Moon from "@gravity-ui/icons/Moon";
import Person from "@gravity-ui/icons/Person";
import Sun from "@gravity-ui/icons/Sun";
import { Button } from "@heroui/react";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { useCustomerAuth } from "@/src/features/loyalty/hooks/useCustomerAuth";
import {
  PUBLIC_BRAND_NAME,
  type BusinessProfile,
} from "@/shared/utils/business-profile";

type PublicBusiness = Pick<
  BusinessProfile,
  "businessName" | "address" | "logoPath"
>;

function navLinkClass(isActive: boolean, cta = false) {
  const base = "scheduly-nav-link";
  if (cta) return `${base} scheduly-nav-link--cta`;
  return isActive ? `${base} scheduly-nav-link--active` : base;
}

export function PublicShell({
  children,
  active = "home",
}: {
  children: ReactNode;
  active?:
    | "home"
    | "booking"
    | "feed"
    | "account"
    | "myTurn"
    | "catalog"
    | "promos";
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { customer, logout } = useCustomerAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [themeReady, setThemeReady] = useState(false);
  const showPanelBack = active !== "home" && active !== "account";
  const isDark = themeReady && resolvedTheme === "dark";

  useEffect(() => {
    const timer = window.setTimeout(() => setThemeReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/settings"), { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as PublicBusiness | null;
        if (!cancelled && res.ok && json) {
          setLogoPath(json.logoPath ?? null);
        }
      } catch {
        // keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logoUrl = logoPath ? apiUrl(logoPath) : null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 15% -10%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 55%),
            radial-gradient(ellipse 70% 45% at 90% 0%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 50%),
            linear-gradient(180deg, var(--background) 0%, var(--background) 100%)
          `,
        }}
      />

      <header className="scheduly-navbar">
        <div className="scheduly-navbar__inner mx-auto h-16 max-w-5xl justify-between px-4 sm:px-6">
          <Link href={appRoutes.home} className="scheduly-navbar__brand">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="scheduly-navbar__brand-mark h-9 w-9 bg-surface-secondary object-contain p-0.5"
              />
            ) : (
              <span className="scheduly-navbar__brand-mark">
                <Calendar width={18} height={18} />
              </span>
            )}
            <span className="min-w-0">
              <span className="scheduly-navbar__brand-title block">
                {PUBLIC_BRAND_NAME}
              </span>
              <span className="scheduly-navbar__brand-sub hidden sm:block">
                Reserva en línea
              </span>
            </span>
          </Link>

          <nav className="scheduly-nav" aria-label="Acciones de cuenta">
            <button
              type="button"
              className="scheduly-navbar__icon-btn shrink-0"
              aria-label={
                isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
              }
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun width={16} height={16} />
              ) : (
                <Moon width={16} height={16} />
              )}
            </button>
            <Link
              href={appRoutes.loyalty.customerPortal}
              className={`${navLinkClass(active === "account", Boolean(customer))} gap-2`}
              aria-current={active === "account" ? "page" : undefined}
            >
              <Person width={16} height={16} />
              <span>Mi cuenta</span>
            </Link>
            {!customer ? (
              <Link
                href={appRoutes.login}
                className={navLinkClass(false, true)}
              >
                Ingresar
              </Link>
            ) : (
              <>
                <span className="hidden px-2 text-sm text-muted sm:inline">
                  {customer.name.split(" ")[0]} ·{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {customer.points} pts
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={loggingOut}
                  onPress={() => void handleLogout()}
                >
                  {loggingOut ? "Saliendo..." : "Salir"}
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {showPanelBack ? (
        <div className="relative z-10 border-b border-separator bg-surface/70 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl px-4 py-2 sm:px-6">
            <Link
              href={appRoutes.loyalty.customerPortal}
              className="md-btn inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium text-muted hover:text-foreground"
            >
              <ArrowChevronLeft width={14} height={14} />
              Volver al panel
            </Link>
          </div>
        </div>
      ) : null}

      <main className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

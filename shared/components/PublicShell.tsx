"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Calendar from "@gravity-ui/icons/Calendar";
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

const NAV_ITEMS = [
  { key: "home" as const, href: appRoutes.home, label: "Inicio" },
  { key: "booking" as const, href: appRoutes.booking, label: "Reservar" },
  {
    key: "myTurn" as const,
    href: appRoutes.loyalty.myTurn,
    label: "Mi turno",
  },
  {
    key: "catalog" as const,
    href: appRoutes.loyalty.publicCatalog,
    label: "Catálogo",
  },
  { key: "promos" as const, href: appRoutes.loyalty.promos, label: "Promos" },
  { key: "feed" as const, href: appRoutes.loyalty.feed, label: "Novedades" },
];

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
  const { customer, logout } = useCustomerAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);

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
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
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

          <nav className="scheduly-nav" aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={navLinkClass(active === item.key)}
              >
                {item.label}
              </Link>
            ))}
            {!customer ? (
              <>
                <Link
                  href={appRoutes.loyalty.customerPortal}
                  className={navLinkClass(active === "account")}
                >
                  Mi cuenta
                </Link>
                <Link
                  href={appRoutes.login}
                  className={navLinkClass(false, true)}
                >
                  Ingresar
                </Link>
              </>
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

      <main className="relative z-10">{children}</main>
    </div>
  );
}

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

function navClass(isActive: boolean) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-[#D4AF37]/20 text-[#F5E6A3] shadow-[0_0_18px_rgba(212,175,55,0.35)]"
      : "text-[#C8C0A8] hover:bg-white/5 hover:text-[#F5E6A3]"
  }`;
}

export function PublicShell({
  children,
  active = "home",
}: {
  children: ReactNode;
  active?: "home" | "booking" | "feed" | "account";
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
    <div className="public-gold relative min-h-screen overflow-x-hidden bg-[#050505] text-[#F3EBD4]">
      <style>{`
        .public-gold {
          --accent: #D4AF37;
          --accent-foreground: #0A0804;
          --focus: #F0D060;
          --foreground: #F3EBD4;
          --muted: #A89F88;
          --surface: #0C0C0C;
          --surface-secondary: #141414;
          --separator: #2A2418;
          --background: #050505;
        }
        .public-gold-glow {
          text-shadow:
            0 0 8px rgba(212, 175, 55, 0.55),
            0 0 22px rgba(212, 175, 55, 0.28);
        }
        .public-gold-bar {
          box-shadow:
            0 1px 0 rgba(212, 175, 55, 0.22),
            0 8px 32px rgba(0, 0, 0, 0.55);
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 15% -10%, rgba(212,175,55,0.28), transparent 55%),
            radial-gradient(ellipse 70% 45% at 90% 0%, rgba(240,208,96,0.16), transparent 50%),
            linear-gradient(180deg, #0A0804 0%, #050505 42%, #000000 100%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="public-gold-bar sticky top-0 z-50 border-b border-[#D4AF37]/25 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href={appRoutes.home}
            className="flex min-w-0 shrink-0 items-center gap-2.5"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-9 w-9 rounded-xl object-contain bg-[#141414] ring-1 ring-[#D4AF37]/35"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0A0804] shadow-[0_0_20px_rgba(212,175,55,0.55)]">
                <Calendar width={18} height={18} />
              </span>
            )}
            <span className="public-gold-glow truncate text-lg font-bold tracking-tight text-[#F5E6A3]">
              {PUBLIC_BRAND_NAME}
            </span>
          </Link>

          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-2">
            <Link href={appRoutes.home} className={navClass(active === "home")}>
              Inicio
            </Link>
            <Link
              href={appRoutes.booking}
              className={navClass(active === "booking")}
            >
              Reservar
            </Link>
            <Link
              href={appRoutes.loyalty.feed}
              className={navClass(active === "feed")}
            >
              Novedades
            </Link>
            {!customer ? (
              <>
                <Link
                  href={appRoutes.loyalty.customerPortal}
                  className={navClass(active === "account")}
                >
                  Mi cuenta
                </Link>
                <Link
                  href={appRoutes.login}
                  className="rounded-xl border border-[#D4AF37]/45 bg-[#D4AF37]/10 px-3 py-2 text-sm font-semibold text-[#F5E6A3] shadow-[0_0_16px_rgba(212,175,55,0.25)] transition-colors hover:bg-[#D4AF37]/20"
                >
                  Ingresar
                </Link>
              </>
            ) : (
              <>
                <span className="hidden text-sm text-[#A89F88] sm:inline">
                  {customer.name.split(" ")[0]} ·{" "}
                  <span className="font-semibold tabular-nums text-[#F5E6A3]">
                    {customer.points} pts
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={loggingOut}
                  onPress={() => void handleLogout()}
                >
                  {loggingOut ? "Saliendo..." : "Cerrar sesión"}
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

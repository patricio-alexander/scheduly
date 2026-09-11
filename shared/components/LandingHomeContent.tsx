"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import Calendar from "@gravity-ui/icons/Calendar";
import Clock from "@gravity-ui/icons/Clock";
import Person from "@gravity-ui/icons/Person";
import MapPin from "@gravity-ui/icons/MapPin";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  DEFAULT_BUSINESS_NAME,
  PUBLIC_BRAND_NAME,
} from "@/shared/utils/business-profile";

const highlights = [
  {
    icon: Calendar,
    title: "Agenda en minutos",
    description: "Elige servicio, día y hora sin llamadas ni mensajes.",
  },
  {
    icon: Clock,
    title: "Horarios reales",
    description: "Solo ves espacios disponibles. Sin ida y vuelta.",
  },
  {
    icon: Person,
    title: "Sin crear cuenta",
    description: "Reservas con tus datos. Simple y directo.",
  },
];

type Props = {
  /** Enlace “Ingresar” al login del staff (solo en la web pública). */
  showLoginLink?: boolean;
  /** Texto extra bajo la bienvenida (p. ej. nombre del usuario logueado). */
  staffGreeting?: string | null;
  /**
   * `page` = portada pública a ancho completo.
   * `panel` = misma vista dentro del shell del staff (ocupa el viewport, sin scroll).
   */
  variant?: "page" | "panel";
};

/**
 * Misma portada pública: marca, negocio, reservar y destacados.
 * Dentro del panel staff se reutiliza sin el botón Ingresar.
 */
export function LandingHomeContent({
  showLoginLink = false,
  staffGreeting = null,
  variant = "page",
}: Props) {
  const [businessName, setBusinessName] = useState(DEFAULT_BUSINESS_NAME);
  const [address, setAddress] = useState("");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/settings"), { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && json) {
          if (typeof json.businessName === "string" && json.businessName) {
            setBusinessName(json.businessName);
          }
          if (typeof json.address === "string") setAddress(json.address);
          if (typeof json.logoPath === "string" || json.logoPath === null) {
            setLogoPath(json.logoPath);
          }
        }
      } catch {
        // defaults
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logoUrl = logoPath ? apiUrl(logoPath) : null;
  const isPanel = variant === "panel";
  const shellClass = isPanel
    ? "relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground"
    : "relative overflow-hidden bg-transparent text-foreground";

  return (
    <div className={shellClass}>
      <style>{`
        @keyframes home-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes home-neon {
          0%, 100% { opacity: 0.35; filter: blur(40px); }
          50% { opacity: 0.6; filter: blur(52px); }
        }
        .home-rise { animation: home-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .home-rise-2 { animation: home-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
        .home-rise-3 { animation: home-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both; }
        .home-orb { animation: home-neon 5.5s ease-in-out infinite; }
        .home-title-glow {
          text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 40%, transparent);
        }
        @media (prefers-reduced-motion: reduce) {
          .home-rise, .home-rise-2, .home-rise-3, .home-orb {
            animation: none !important;
          }
        }
      `}</style>

      {isPanel ? (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
            radial-gradient(ellipse 80% 50% at 15% -10%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 55%),
            radial-gradient(ellipse 70% 45% at 90% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 50%),
            linear-gradient(180deg, var(--background) 0%, var(--background) 100%)
          `,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--accent) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
        </>
      ) : null}

      <section
        className={`relative mx-auto flex w-full max-w-5xl flex-col justify-center px-4 sm:px-6 ${
          isPanel
            ? "min-h-0 flex-1 py-6 sm:py-8"
            : "pb-10 pt-16 sm:pb-12 sm:pt-20"
        }`}
      >
        <div
          className={`home-orb pointer-events-none absolute -right-10 top-4 rounded-full ${
            isPanel ? "h-56 w-56 sm:h-72 sm:w-72" : "h-72 w-72 sm:h-96 sm:w-96"
          }`}
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 45%, transparent), color-mix(in srgb, var(--accent) 8%, transparent) 45%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -left-16 top-28 h-56 w-56 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 25%, transparent), transparent 70%)",
          }}
        />

        <div
          className={`relative z-10 max-w-2xl ${ready ? "" : "opacity-0"}`}
          data-onboarding={isPanel ? "inicio-hero" : undefined}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className={`home-rise rounded-2xl object-contain ring-1 ring-accent/40 ${
                isPanel ? "mb-4 h-11 w-11" : "mb-6 h-14 w-14"
              }`}
            />
          ) : null}

          <p
            className={`home-rise home-title-glow font-bold tracking-tight text-foreground ${
              isPanel
                ? "text-4xl sm:text-5xl lg:text-6xl lg:leading-[0.98]"
                : "text-5xl sm:text-6xl lg:text-[4.5rem] lg:leading-[0.98]"
            }`}
          >
            {PUBLIC_BRAND_NAME}
          </p>

          <h1
            className={`home-rise-2 font-medium tracking-tight text-foreground/90 ${
              isPanel
                ? "mt-3 text-lg sm:text-xl"
                : "mt-5 text-xl sm:text-2xl"
            }`}
          >
            Belleza y cuidado en Loja
          </h1>

          <p
            className={`home-rise-2 max-w-md leading-relaxed text-muted ${
              isPanel
                ? "mt-3 text-sm sm:text-base"
                : "mt-4 text-base sm:text-lg"
            }`}
          >
            {businessName}. Peluquería, tratamientos, spa de uñas, depilación y
            maquillaje. Agenda tu cita de lunes a sábado, 8:00 AM – 8:00 PM.
          </p>

          {staffGreeting ? (
            <p className="home-rise-2 mt-2 text-sm font-medium text-accent">
              {staffGreeting}
            </p>
          ) : null}

          <div
            className={`home-rise-3 flex flex-wrap items-center gap-4 ${
              isPanel ? "mt-6" : "mt-9"
            }`}
          >
            <Link href={appRoutes.booking}>
              <Button
                variant="primary"
                size="lg"
                className="min-w-[160px] gap-2 px-7 shadow-[0_0_28px_color-mix(in_srgb,var(--accent)_35%,transparent)]"
              >
                Reservar
                <ArrowRight width={16} height={16} />
              </Button>
            </Link>
            {showLoginLink ? (
              <Link
                href={appRoutes.login}
                className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Ingresar
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="relative z-10 shrink-0 border-t border-separator"
        data-onboarding={isPanel ? "inicio-highlights" : undefined}
      >
        <div
          className={`mx-auto max-w-5xl px-4 sm:px-6 ${
            isPanel ? "py-5 sm:py-6" : "py-12 sm:py-14"
          }`}
        >
          <div
            className={`grid sm:grid-cols-3 ${
              isPanel ? "gap-5 sm:gap-6" : "gap-10 sm:gap-8"
            }`}
          >
            {highlights.map(({ icon: Icon, title, description }) => (
              <div key={title}>
                <div
                  className={`mb-3 flex items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-[0_0_22px_color-mix(in_srgb,var(--accent)_35%,transparent)] ${
                    isPanel ? "h-9 w-9" : "mb-4 h-11 w-11"
                  }`}
                >
                  <Icon width={isPanel ? 16 : 18} height={isPanel ? 16 : 18} />
                </div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  {title}
                </h2>
                <p
                  className={`mt-1.5 leading-relaxed text-muted ${
                    isPanel ? "text-xs sm:text-sm" : "text-sm"
                  }`}
                >
                  {description}
                </p>
              </div>
            ))}
          </div>

          {address ? (
            <p
              className={`flex items-start gap-2 border-t border-separator text-muted ${
                isPanel
                  ? "mt-4 pt-4 text-xs sm:text-sm"
                  : "mt-10 pt-8 text-sm"
              }`}
            >
              <MapPin
                width={15}
                height={15}
                className="mt-0.5 shrink-0 text-accent"
              />
              <span className="line-clamp-2">{address}</span>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

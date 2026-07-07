"use client";

import { useAuth } from "@/src/features/auth";
import { LoginForm } from "@/src/features/auth";
import { Skeleton } from "@/shared/components/ui";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import Calendar from "@gravity-ui/icons/Calendar";
import Clock from "@gravity-ui/icons/Clock";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import Bell from "@gravity-ui/icons/Bell";

const features = [
  {
    icon: Calendar,
    title: "Agenda centralizada",
    description: "Organiza turnos con vista de calendario intuitiva",
  },
  {
    icon: ChartColumn,
    title: "Panel de control",
    description: "Métricas e ingresos de tu negocio en tiempo real",
  },
  {
    icon: Bell,
    title: "Notificaciones",
    description: "Mantente al día con la actividad de tu equipo",
  },
];

function LoginSkeleton() {
  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-surface rounded-2xl border border-separator shadow-xl p-8 sm:p-10">
        <div className="flex flex-col items-center gap-2 mb-8 lg:items-start">
          <Skeleton className="h-12 w-12 rounded-xl lg:hidden" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-accent p-12 text-accent-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-foreground/10 p-2.5 backdrop-blur-sm">
              <Calendar width={24} height={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">Scheduly</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight">
              Gestiona tu negocio
              <br />
              con claridad
            </h2>
            <p className="mt-3 text-accent-foreground/75 max-w-md text-base leading-relaxed">
              Turnos, clientes y servicios en una plataforma diseñada para equipos que valoran su tiempo.
            </p>
          </div>

          <ul className="space-y-5">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <div className="rounded-xl bg-accent-foreground/10 p-2.5 shrink-0">
                  <Icon width={18} height={18} />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-accent-foreground/70 mt-0.5">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-accent-foreground/50">
          © {new Date().getFullYear()} Scheduly
        </p>
      </div>

      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 sm:p-10 bg-background">
        <div
          className="pointer-events-none absolute inset-0 lg:hidden"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--accent) 18%, transparent), transparent)",
          }}
        />
        <div className="relative w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <LoginShell>
        <LoginSkeleton />
      </LoginShell>
    );
  }

  if (user) return null;

  return (
    <LoginShell>
      <div className="bg-surface rounded-2xl border border-separator shadow-xl p-8 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent lg:hidden">
            <Calendar width={24} height={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bienvenido</h1>
          <p className="mt-1.5 text-sm text-muted">
            Ingresa tus credenciales para acceder a tu cuenta
          </p>
        </div>

        <LoginForm />

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted lg:justify-start">
          <Clock width={14} height={14} />
          <span>Acceso seguro para tu equipo</span>
        </div>
      </div>
    </LoginShell>
  );
}

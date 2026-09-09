"use client";

import { LandingHomeContent } from "@/shared/components/LandingHomeContent";
import { useAuth } from "@/src/features/auth";
import { roleLabel } from "@/shared/utils/roles";

/** Portada del negocio a pantalla completa del área principal (sin scroll). */
export default function InicioPage() {
  const { user } = useAuth();
  if (!user) return null;

  const firstName = user.name?.split(" ")[0] ?? "";
  const greeting = firstName
    ? `Hola, ${firstName} · ${roleLabel(user.role)}`
    : `Sesión activa · ${roleLabel(user.role)}`;

  return (
    <div className="h-full min-h-0 w-full">
      <LandingHomeContent
        showLoginLink={false}
        variant="panel"
        staffGreeting={greeting}
      />
    </div>
  );
}

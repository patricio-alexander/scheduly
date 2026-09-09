"use client";

import { PublicShell } from "@/shared/components/PublicShell";
import { LandingHomeContent } from "@/shared/components/LandingHomeContent";

export default function LandingPage() {
  return (
    <PublicShell active="home">
      <LandingHomeContent showLoginLink />
    </PublicShell>
  );
}

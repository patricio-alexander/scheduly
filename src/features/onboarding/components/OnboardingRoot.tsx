"use client";

import { OnboardingProvider } from "../hooks/useOnboarding";
import { OnboardingWelcome } from "./OnboardingWelcome";
import { OnboardingTour } from "./OnboardingTour";

export function OnboardingRoot({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      {children}
      <OnboardingWelcome />
      <OnboardingTour />
    </OnboardingProvider>
  );
}

export { useOnboarding } from "../hooks/useOnboarding";

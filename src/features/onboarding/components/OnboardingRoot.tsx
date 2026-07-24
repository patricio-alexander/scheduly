"use client";

import { OnboardingProvider } from "../hooks/useOnboarding";
import { OnboardingWelcome } from "./OnboardingWelcome";
import { OnboardingTour } from "./OnboardingTour";
import { ModuleGuidePrompt } from "./ModuleGuidePrompt";

export function OnboardingRoot({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      {children}
      <OnboardingWelcome />
      <OnboardingTour />
      <ModuleGuidePrompt />
    </OnboardingProvider>
  );
}

export { useOnboarding } from "../hooks/useOnboarding";

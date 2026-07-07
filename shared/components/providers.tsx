"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/src/features/auth/hooks/useAuth";
import { Toast } from "@heroui/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme">
      <AuthProvider>
        <Toast.Provider placement="top" />
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}

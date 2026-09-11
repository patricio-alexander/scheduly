"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/src/features/auth/hooks/useAuth";
import { CustomerAuthProvider } from "@/src/features/loyalty/hooks/useCustomerAuth";
import { Toast } from "@heroui/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme">
      <AuthProvider>
        <CustomerAuthProvider>
          <Toast.Provider placement="top" />
          {children}
        </CustomerAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

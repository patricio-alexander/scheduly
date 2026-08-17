"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiUrl } from "@/shared/utils/api";
import type { CustomerAccountUser } from "../types";
import { loginCustomer, logoutCustomer } from "../services/loyalty-service";

interface CustomerAuthContextType {
  customer: CustomerAccountUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<CustomerAccountUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<CustomerAccountUser | null>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(
  undefined,
);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerAccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/customer-auth/me"), {
        credentials: "include",
      });
      if (!res.ok) {
        setCustomer(null);
        return null;
      }
      const data = (await res.json()) as { customer: CustomerAccountUser };
      setCustomer(data.customer);
      return data.customer;
    } catch {
      setCustomer(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const user = await loginCustomer(email, password);
    setCustomer(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    setCustomer(null);
    await logoutCustomer();
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{ customer, loading, login, logout, refresh }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return context;
}

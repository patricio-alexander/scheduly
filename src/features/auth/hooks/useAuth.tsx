"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiUrl } from "@/shared/utils/api";
import type { AuthUser } from "../types";
import { loginUser, logoutUser } from "../services/auth-service";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem("scheduly_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("scheduly_user");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        persistUser(null);
        return;
      }
      const userData = (await res.json()) as AuthUser;
      setUser(userData);
      persistUser(userData);
    } catch {
      const stored = localStorage.getItem("scheduly_user");
      if (stored) {
        try {
          setUser(JSON.parse(stored) as AuthUser);
        } catch {
          localStorage.removeItem("scheduly_user");
        }
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshUser();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = useCallback(async (username: string, password: string) => {
    const userData = await loginUser(username, password);
    setUser(userData);
    persistUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    persistUser(null);
    void logoutUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

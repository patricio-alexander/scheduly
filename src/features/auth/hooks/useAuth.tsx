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
import {
  changeUserRole,
  loginUser,
  logoutUser,
} from "../services/auth-service";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  /** Cierra sesión en servidor (cookie) y limpia estado local. */
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changeRole: (roleId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_CACHE_KEY = "scheduly_user";

function persistUser(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fuente de verdad: cookie httpOnly vía GET /api/auth/me.
   * localStorage solo cachea tras un /me OK; nunca crea sesión sola.
   */
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/me"), {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 404) {
        setUser(null);
        persistUser(null);
        return;
      }
      if (!res.ok) {
        // Servidor inestable: no inventar sesión desde cache
        setUser(null);
        return;
      }
      const userData = (await res.json()) as AuthUser;
      setUser(userData);
      persistUser(userData);
    } catch {
      // Red caída: sin cookie verificada → sin usuario
      setUser(null);
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

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      // Siempre limpia cliente aunque el POST falle
      setUser(null);
      persistUser(null);
    }
  }, []);

  const changeRole = useCallback(async (roleId: number) => {
    const userData = await changeUserRole(roleId);
    setUser(userData);
    persistUser(userData);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser, changeRole }}
    >
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

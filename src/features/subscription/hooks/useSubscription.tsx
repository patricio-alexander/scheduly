"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiUrl } from "@/shared/utils/api";
import { useAuth } from "@/src/features/auth";
import type { SubscriptionModule, SubscriptionSection, SubscriptionState } from "../types";
import {
  accessDescription,
  accessTitle,
  resolveAccessView,
  type AccessViewKind,
} from "../lib/access-status";
import {
  findModuleByKey,
  findModuleForPath,
  findSectionInState,
  parseSubscriptionState,
} from "../lib/subscription-utils";

interface SubscriptionContextValue {
  data: SubscriptionState | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  syncPull: () => Promise<void>;
  isAppInMaintenance: boolean;
  isSubscribed: boolean;
  isDeveloper: boolean;
  getModule: (moduleKey: string) => SubscriptionModule | null;
  getModuleForPath: (pathname: string) => SubscriptionModule | null;
  getSectionForPath: (pathname: string) => {
    module: SubscriptionModule | null;
    section: SubscriptionSection | null;
  };
  resolvePathAccess: (pathname: string) => {
    kind: AccessViewKind;
    title: string;
    description: string;
    module: SubscriptionModule | null;
    section: SubscriptionSection | null;
  };
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(
  undefined,
);

function extractSubscriptionPayload(raw: unknown): unknown {
  if (!raw) return null;

  // Respuesta directa en el formato esperado
  if (
    typeof raw === "object" &&
    raw !== null &&
    ("maintenance" in raw || "subscribed" in raw || "subscription" in raw)
  ) {
    return raw;
  }

  // Lista de entitlements: usar el payload más reciente
  if (Array.isArray(raw) && raw.length > 0) {
    const latest = raw[0] as { payload?: unknown };
    return latest.payload ?? null;
  }

  // Un entitlement individual
  if (typeof raw === "object" && raw !== null && "payload" in raw) {
    return (raw as { payload: unknown }).payload;
  }

  return raw;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeveloper = user?.role === "admin";

  const applyEntitlementResponse = useCallback((json: unknown) => {
    setData(parseSubscriptionState(extractSubscriptionPayload(json)));
  }, []);

  const refetch = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = Boolean(options?.silent);
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(apiUrl("/api/entitlements"), {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("No se pudo cargar la suscripción");
        }
        const json: unknown = await res.json();
        applyEntitlementResponse(json);
        if (silent) setError(null);
      } catch (e) {
        if (!silent) {
          setError(e instanceof Error ? e.message : "Error de suscripción");
          setData({ maintenance: false, subscribed: false, subscription: null });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [applyEntitlementResponse],
  );

  const syncPull = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/entitlements"), {
        method: "PUT",
        cache: "no-store",
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          json &&
          typeof json === "object" &&
          json !== null &&
          "message" in json &&
          typeof (json as { message: unknown }).message === "string"
            ? (json as { message: string }).message
            : "No se pudo verificar la suscripción";
        throw new Error(message);
      }
      // Actualiza la UI de inmediato con la respuesta del PUT
      applyEntitlementResponse(json);
      // Y relee el listado por si el GET ordena/normaliza distinto
      await refetch({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al verificar suscripción");
    } finally {
      setSyncing(false);
    }
  }, [applyEntitlementResponse, refetch]);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }
    void refetch();
  }, [user, refetch]);

  // Polling: refleja pushes del gestor sin recargar la página
  useEffect(() => {
    if (!user) return;

    const POLL_MS = 15_000;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refetch({ silent: true });
    }, POLL_MS);

    const onFocus = () => {
      void refetch({ silent: true });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, refetch]);

  const value = useMemo<SubscriptionContextValue>(() => {
    const getModule = (moduleKey: string) => findModuleByKey(data, moduleKey);
    const getModuleForPathFn = (pathname: string) => findModuleForPath(data, pathname);
    const getSectionForPathFn = (pathname: string) => findSectionInState(data, pathname);

    const resolvePathAccess = (pathname: string) => {
      if (data?.maintenance) {
        return {
          kind: "maintenance" as const,
          title: accessTitle("maintenance"),
          description: "La aplicación está en mantenimiento. Vuelve a intentarlo más tarde.",
          module: null,
          section: null,
        };
      }

      if (!data?.subscribed) {
        return {
          kind: "unsubscribed" as const,
          title: accessTitle("unsubscribed"),
          description: accessDescription("unsubscribed"),
          module: null,
          section: null,
        };
      }

      const { module, section } = getSectionForPathFn(pathname);

      if (module) {
        const moduleView = resolveAccessView(module.status, { isDeveloper });
        if (moduleView !== "ok") {
          return {
            kind: moduleView,
            title: accessTitle(moduleView),
            description: accessDescription(moduleView, module.name),
            module,
            section,
          };
        }
      }

      if (section) {
        const sectionView = resolveAccessView(section.status, { isDeveloper });
        if (sectionView !== "ok") {
          return {
            kind: sectionView,
            title: accessTitle(sectionView),
            description: accessDescription(sectionView, section.name),
            module,
            section,
          };
        }
      }

      return {
        kind: "ok" as const,
        title: "",
        description: "",
        module,
        section,
      };
    };

    return {
      data,
      loading,
      syncing,
      error,
      refetch,
      syncPull,
      isAppInMaintenance: Boolean(data?.maintenance),
      isSubscribed: Boolean(data?.subscribed),
      isDeveloper,
      getModule,
      getModuleForPath: getModuleForPathFn,
      getSectionForPath: getSectionForPathFn,
      resolvePathAccess,
    };
  }, [data, loading, syncing, error, refetch, syncPull, isDeveloper]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildDevOpenSubscriptionState } from "@/shared/utils/dev-subscription";
import { useAuth } from "@/src/features/auth";
import { isOwnerRole } from "@/shared/utils/roles";
import type { SubscriptionModule, SubscriptionSection, SubscriptionState } from "../types";
import type { AccessViewKind } from "../lib/access-status";
import {
  findModuleByKey,
  findModuleForPath,
  findSectionInState,
  isSubscriptionExpired,
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
  isExpired: boolean;
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

/** Provider local: todos los módulos abiertos, sin sync externo. */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data] = useState<SubscriptionState>(() =>
    buildDevOpenSubscriptionState(),
  );

  const isDeveloper = isOwnerRole(user?.role);

  const refetch = useCallback(async () => {}, []);
  const syncPull = useCallback(async () => {}, []);

  const value = useMemo<SubscriptionContextValue>(() => {
    const getModule = (moduleKey: string) => findModuleByKey(data, moduleKey);
    const getModuleForPathFn = (pathname: string) =>
      findModuleForPath(data, pathname);
    const getSectionForPathFn = (pathname: string) =>
      findSectionInState(data, pathname);

    const resolvePathAccess = (_pathname: string) => ({
      kind: "ok" as const,
      title: "",
      description: "",
      module: null,
      section: null,
    });

    return {
      data,
      loading: false,
      syncing: false,
      error: null,
      refetch,
      syncPull,
      isAppInMaintenance: false,
      isSubscribed: true,
      isExpired: isSubscriptionExpired(data),
      isDeveloper,
      getModule,
      getModuleForPath: getModuleForPathFn,
      getSectionForPath: getSectionForPathFn,
      resolvePathAccess,
    };
  }, [data, refetch, syncPull, isDeveloper]);

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

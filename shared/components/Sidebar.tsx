"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import ArrowChevronDown from "@gravity-ui/icons/ArrowChevronDown";
import { useAuth } from "@/src/features/auth";
import { useSubscription } from "@/src/features/subscription";
import {
  accessTitle,
  resolveAccessView,
  type AccessViewKind,
} from "@/src/features/subscription/lib/access-status";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
  isProgrammerRole,
  isPureEmployeeRole,
  hasEmployeeExperience,
} from "@/shared/utils/roles";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  navModules,
  type NavItem,
  type NavModule,
} from "@/shared/components/nav-config";
import { filterVisibleModules, navItemLabelForRole } from "@/shared/utils/nav-visibility";

const MODULES_STORAGE_KEY = "scheduly-sidebar-modules";

function pathWithoutQuery(href: string) {
  return href.split("?")[0] ?? href;
}

function hrefQuery(href: string) {
  const q = href.split("?")[1];
  return q ? `?${q}` : "";
}

function isRouteActive(pathname: string, href: string, search = "") {
  const path = pathWithoutQuery(href);
  const wantedQuery = hrefQuery(href);
  const currentSearch = search.startsWith("?") ? search : search ? `?${search}` : "";

  if (path === appRoutes.inicio || path === appRoutes.dashboard) {
    return pathname === path && !wantedQuery;
  }

  const pathMatches = pathname === path || pathname.startsWith(`${path}/`);
  if (!pathMatches) return false;

  if (path === appRoutes.system.settings) {
    const tab = new URLSearchParams(
      currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
    ).get("tab");
    const wantedTab = new URLSearchParams(
      wantedQuery.startsWith("?") ? wantedQuery.slice(1) : wantedQuery,
    ).get("tab");

    if (wantedTab) return tab === wantedTab;
    // Enlaces propios: SRI (comprobantes) y Backups (sistema).
    return tab !== "sri" && tab !== "backups";
  }

  if (path === appRoutes.operation.agenda) {
    const onMine = currentSearch.includes("view=mine");
    if (wantedQuery.includes("view=mine")) return onMine;
    if (wantedQuery) return currentSearch === wantedQuery;
    return !onMine;
  }

  if (wantedQuery) {
    return currentSearch === wantedQuery || currentSearch.includes(wantedQuery.slice(1));
  }

  return true;
}

function statusBadgeTone(kind: AccessViewKind) {
  switch (kind) {
    case "maintenance":
      return { dot: "bg-danger", pill: "bg-danger/15 text-danger" };
    case "planned":
      return { dot: "bg-warning", pill: "bg-warning/20 text-warning" };
    case "development":
    case "developer":
      return { dot: "bg-accent", pill: "bg-accent/15 text-accent" };
    default:
      return { dot: "bg-muted", pill: "bg-surface-secondary text-muted" };
  }
}

function StatusBadge({
  label,
  kind,
  compact,
}: {
  label: string;
  kind: AccessViewKind;
  compact?: boolean;
}) {
  const tone = statusBadgeTone(kind);
  if (compact) {
    return (
      <span
        className={`pointer-events-none absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-surface ${tone.dot}`}
        title={label}
      />
    );
  }
  return (
    <span
      className={`ml-auto max-w-[88px] shrink-0 truncate rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-none ${tone.pill}`}
    >
      {label}
    </span>
  );
}

function NavButton({
  isActive,
  onPress,
  collapsed,
  label,
  badge,
  statusLabel,
  statusKind,
  nested,
  tourId,
  children,
}: {
  isActive: boolean;
  onPress: () => void;
  collapsed?: boolean;
  label?: string;
  badge?: number;
  statusLabel?: string | null;
  statusKind?: AccessViewKind | null;
  nested?: boolean;
  tourId?: string;
  children: ReactNode;
}) {
  const title = statusLabel && label ? `${label} · ${statusLabel}` : label;
  return (
    <div
      className="relative w-full"
      title={collapsed ? title : undefined}
      data-onboarding={tourId}
    >
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={`relative w-full ${collapsed ? "justify-center px-0" : "justify-start"} ${nested && !collapsed ? "pl-8" : ""} ${isActive ? "font-medium" : ""}`}
        onPress={onPress}
        aria-label={title}
      >
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
        )}
        {children}
        {!collapsed && statusLabel && statusKind ? (
          <StatusBadge label={statusLabel} kind={statusKind} />
        ) : null}
        {!collapsed && !statusLabel && badge != null && badge > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </Button>
      {collapsed && statusLabel && statusKind ? (
        <StatusBadge label={statusLabel} kind={statusKind} compact />
      ) : null}
    </div>
  );
}

type SidebarProps = {
  collapsed: boolean;
};

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const router = useRouter();
  const { user } = useAuth();
  const { getModule, getSectionForPath, isDeveloper, isAppInMaintenance } =
    useSubscription();
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const isOwner = isOwnerRole(user?.role);
  const isManagement = isManagementRole(user?.role);
  const isBranchAdmin = isBranchAdminRole(user?.role);
  const isPureEmployee = isPureEmployeeRole(user?.role);
  const showEmployeeExperience = hasEmployeeExperience(user?.role);
  const isProgrammer = isProgrammerRole(user?.role);

  const visibleModules = filterVisibleModules(navModules, {
    isOwner,
    isManagement,
    isBranchAdmin,
    isPureEmployee,
    showEmployeeExperience,
    isProgrammer,
  });

  useEffect(() => {
    const activeMod =
      navModules.find((mod) =>
        mod.items.some((item) => isRouteActive(pathname, item.href)),
      )?.id ?? null;

    const storedModules = localStorage.getItem(MODULES_STORAGE_KEY);
    if (storedModules) {
      try {
        const parsed = JSON.parse(storedModules) as Record<string, boolean>;
        const openId =
          (activeMod && parsed[activeMod] ? activeMod : null) ??
          Object.keys(parsed).find((id) => parsed[id]) ??
          activeMod;
        const next: Record<string, boolean> = {};
        for (const mod of navModules) {
          next[mod.id] = openId === mod.id;
        }
        setOpenModules(next);
        return;
      } catch {
        // fallback
      }
    }

    const defaults: Record<string, boolean> = {};
    for (const mod of navModules) {
      defaults[mod.id] = activeMod === mod.id;
    }
    setOpenModules(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const activeMod = navModules.find((mod) =>
      mod.items.some((item) => isRouteActive(pathname, item.href)),
    )?.id;
    if (!activeMod) return;

    setOpenModules((prev) => {
      if (prev[activeMod] && Object.values(prev).filter(Boolean).length === 1) {
        return prev;
      }
      const next: Record<string, boolean> = {};
      for (const mod of navModules) {
        next[mod.id] = mod.id === activeMod;
      }
      localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    const onExpand = (event: Event) => {
      const moduleId = (event as CustomEvent<{ moduleId?: string }>).detail
        ?.moduleId;
      if (!moduleId) return;

      if (moduleId === "all") {
        const next: Record<string, boolean> = {};
        for (const mod of navModules) {
          next[mod.id] = true;
        }
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(next));
        setOpenModules(next);
        return;
      }

      // Compat: tours viejos pedían "dashboard" / "employee"
      const resolved =
        moduleId === "dashboard"
          ? "operation"
          : moduleId === "employee"
            ? "operation"
            : moduleId === "purchases"
              ? "sales"
              : moduleId;
      setOpenModules((prev) => {
        if (
          prev[resolved] &&
          Object.values(prev).filter(Boolean).length === 1
        ) {
          return prev;
        }
        const next: Record<string, boolean> = {};
        for (const mod of navModules) {
          next[mod.id] = mod.id === resolved;
        }
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener("scheduly:onboarding-expand", onExpand);
    return () => {
      window.removeEventListener("scheduly:onboarding-expand", onExpand);
    };
  }, []);

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => {
      const willOpen = !prev[moduleId];
      const next: Record<string, boolean> = {};
      for (const mod of navModules) {
        next[mod.id] = willOpen && mod.id === moduleId;
      }
      localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const navItemLabel = (item: NavItem) =>
    navItemLabelForRole(item, user?.role);

  return (
    <aside
      data-onboarding="nav-sidebar"
      className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-separator bg-surface transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-[4.5rem]" : "w-64"
      }`}
    >
      <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {visibleModules.map((mod) => {
          const ModuleIcon = mod.icon;
          const isFlat = Boolean(mod.flat) || (isProgrammer && mod.programmerOnly);
          const isOpen = isFlat || collapsed || Boolean(openModules[mod.id]);
          const visibleItems = mod.items;
          const hasActiveChild = visibleItems.some((item) =>
            isRouteActive(pathname, item.href, search),
          );
          const entitlementModule = getModule(mod.entitlementKey);
          const moduleAccess =
            isProgrammer && mod.programmerOnly
              ? "ok"
              : entitlementModule
                ? resolveAccessView(entitlementModule.status, { isDeveloper })
                : "ok";
          const moduleStatusKind: AccessViewKind | null = isAppInMaintenance
            ? "maintenance"
            : moduleAccess !== "ok"
              ? moduleAccess
              : null;
          const moduleStatusLabel = moduleStatusKind
            ? accessTitle(moduleStatusKind)
            : null;

          if (isFlat) {
            return (
              <div key={mod.id} className="flex flex-col gap-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isRouteActive(pathname, item.href, search);
                  const { section } = getSectionForPath(
                    pathWithoutQuery(item.href),
                  );
                  const sectionAccess = section
                    ? resolveAccessView(section.status, { isDeveloper })
                    : "ok";
                  const sectionStatusKind: AccessViewKind | null =
                    isAppInMaintenance
                      ? "maintenance"
                      : sectionAccess !== "ok"
                        ? sectionAccess
                        : null;
                  const sectionStatusLabel = sectionStatusKind
                    ? accessTitle(sectionStatusKind)
                    : null;
                  const displayLabel = navItemLabel(item);

                  return (
                    <NavButton
                      key={item.href}
                      isActive={isActive}
                      collapsed={collapsed}
                      label={displayLabel}
                      statusLabel={sectionStatusLabel}
                      statusKind={sectionStatusKind}
                      nested={false}
                      tourId={item.tourId}
                      onPress={() => router.push(item.href)}
                    >
                      <Icon
                        width={18}
                        height={18}
                        className={collapsed ? "" : "shrink-0"}
                      />
                      {!collapsed && (
                        <span className="flex-1 truncate text-left">
                          {displayLabel}
                        </span>
                      )}
                    </NavButton>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={mod.id} className="flex flex-col gap-1">
              {collapsed ? (
                <div
                  data-onboarding={`nav-mod-${mod.id}`}
                  className={`mb-1 flex items-center justify-center ${hasActiveChild ? "text-accent" : "text-muted"}`}
                  title={
                    moduleStatusLabel
                      ? `${mod.label} · ${moduleStatusLabel}`
                      : mod.label
                  }
                >
                  <ModuleIcon width={16} height={16} />
                </div>
              ) : (
                <button
                  type="button"
                  data-onboarding={`nav-mod-${mod.id}`}
                  onClick={() => toggleModule(mod.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                    hasActiveChild
                      ? "text-accent"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <ModuleIcon width={14} height={14} className="shrink-0" />
                  <span className="flex-1 truncate">{mod.label}</span>
                  {moduleStatusLabel && moduleStatusKind && (
                    <StatusBadge label={moduleStatusLabel} kind={moduleStatusKind} />
                  )}
                  <ArrowChevronDown
                    width={14}
                    height={14}
                    className={`shrink-0 transition-transform duration-200 ease-out ${
                      isOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </button>
              )}

              <div
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "pointer-events-none grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={`flex flex-col gap-1 transition-transform duration-200 ease-out ${
                      isOpen ? "translate-y-0" : "-translate-y-1"
                    }`}
                  >
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isRouteActive(pathname, item.href, search);
                      const { section } = getSectionForPath(
                        pathWithoutQuery(item.href),
                      );
                      const sectionAccess = section
                        ? resolveAccessView(section.status, { isDeveloper })
                        : moduleAccess !== "ok"
                          ? moduleAccess
                          : "ok";
                      const sectionStatusKind: AccessViewKind | null =
                        isAppInMaintenance
                          ? "maintenance"
                          : sectionAccess !== "ok"
                            ? sectionAccess
                            : null;
                      const sectionStatusLabel = sectionStatusKind
                        ? accessTitle(sectionStatusKind)
                        : null;
                      const displayLabel = navItemLabel(item);

                      return (
                        <NavButton
                          key={item.href}
                          isActive={isActive}
                          collapsed={collapsed}
                          label={
                            collapsed
                              ? `${mod.label}: ${displayLabel}`
                              : displayLabel
                          }
                          statusLabel={sectionStatusLabel}
                          statusKind={sectionStatusKind}
                          nested={!collapsed}
                          tourId={item.tourId}
                          onPress={() => router.push(item.href)}
                        >
                          <Icon
                            width={18}
                            height={18}
                            className={collapsed ? "" : "shrink-0"}
                          />
                          {!collapsed && (
                            <span className="flex-1 truncate text-left">
                              {displayLabel}
                            </span>
                          )}
                        </NavButton>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

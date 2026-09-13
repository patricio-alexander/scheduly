"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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

function statusTone(kind: AccessViewKind) {
  switch (kind) {
    case "maintenance":
      return "maintenance";
    case "planned":
      return "planned";
    case "development":
    case "developer":
      return "dev";
    default:
      return "muted";
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
  const tone = statusTone(kind);
  if (compact) {
    return (
      <span
        className={`app-sidebar__status-dot app-sidebar__status-dot--${tone}`}
        title={label}
      />
    );
  }
  return (
    <span className={`app-sidebar__status app-sidebar__status--${tone}`}>
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
  tourId?: string;
  children: ReactNode;
}) {
  const title = statusLabel && label ? `${label} · ${statusLabel}` : label;
  return (
    <div
      className="app-sidebar__item-wrap"
      title={collapsed ? title : undefined}
      data-onboarding={tourId}
    >
      <button
        type="button"
        className={[
          "app-sidebar__item",
          isActive ? "app-sidebar__item--active" : "",
          collapsed ? "app-sidebar__item--collapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onPress}
        aria-label={title}
        aria-current={isActive ? "page" : undefined}
      >
        {children}
        {statusLabel && statusKind ? (
          <StatusBadge label={statusLabel} kind={statusKind} />
        ) : null}
        {!statusLabel && badge != null && badge > 0 && (
          <span className="app-sidebar__badge">{badge > 9 ? "9+" : badge}</span>
        )}
      </button>
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
      className={`app-sidebar${collapsed ? " app-sidebar--collapsed" : ""}`}
    >
      <nav className="app-sidebar__nav">
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

          const renderItem = (item: NavItem, nestedLabel?: string) => {
            const Icon = item.icon;
            const isActive = isRouteActive(pathname, item.href, search);
            const { section } = getSectionForPath(pathWithoutQuery(item.href));
            const sectionAccess = section
              ? resolveAccessView(section.status, { isDeveloper })
              : isFlat
                ? "ok"
                : moduleAccess !== "ok"
                  ? moduleAccess
                  : "ok";
            const sectionStatusKind: AccessViewKind | null = isAppInMaintenance
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
                  collapsed && nestedLabel
                    ? `${nestedLabel}: ${displayLabel}`
                    : displayLabel
                }
                statusLabel={sectionStatusLabel}
                statusKind={sectionStatusKind}
                tourId={item.tourId}
                onPress={() => router.push(item.href)}
              >
                <Icon width={16} height={16} className="app-sidebar__item-icon" />
                <span className="app-sidebar__item-label">{displayLabel}</span>
              </NavButton>
            );
          };

          if (isFlat) {
            return (
              <div key={mod.id} className="app-sidebar__group">
                <div className="app-sidebar__items">
                  {visibleItems.map((item) => renderItem(item))}
                </div>
              </div>
            );
          }

          return (
            <div key={mod.id} className="app-sidebar__group">
              {collapsed ? (
                <div
                  data-onboarding={`nav-mod-${mod.id}`}
                  className={`app-sidebar__section-mark${
                    hasActiveChild ? " app-sidebar__section-mark--active" : ""
                  }`}
                  title={
                    moduleStatusLabel
                      ? `${mod.label} · ${moduleStatusLabel}`
                      : mod.label
                  }
                >
                  <ModuleIcon width={14} height={14} />
                </div>
              ) : (
                <button
                  type="button"
                  data-onboarding={`nav-mod-${mod.id}`}
                  onClick={() => toggleModule(mod.id)}
                  className={`app-sidebar__section${
                    hasActiveChild ? " app-sidebar__section--active" : ""
                  }`}
                >
                  <ModuleIcon
                    width={13}
                    height={13}
                    className="app-sidebar__section-icon"
                  />
                  <span className="app-sidebar__section-label">{mod.label}</span>
                  {moduleStatusLabel && moduleStatusKind && (
                    <StatusBadge
                      label={moduleStatusLabel}
                      kind={moduleStatusKind}
                    />
                  )}
                  <ArrowChevronDown
                    width={12}
                    height={12}
                    className={`app-sidebar__chevron ${
                      isOpen
                        ? "app-sidebar__chevron--open"
                        : "app-sidebar__chevron--closed"
                    }`}
                  />
                </button>
              )}

              <div
                className={`app-sidebar__panel${isOpen ? " is-open" : ""}`}
              >
                <div className="app-sidebar__panel-inner">
                  <div
                    className={`app-sidebar__items${
                      !collapsed ? " app-sidebar__items--nested" : ""
                    }`}
                  >
                    {visibleItems.map((item) => renderItem(item, mod.label))}
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

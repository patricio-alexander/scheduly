"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import House from "@gravity-ui/icons/House";
import Person from "@gravity-ui/icons/Person";
import Persons from "@gravity-ui/icons/Persons";
import Gear from "@gravity-ui/icons/Gear";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import Calendar from "@gravity-ui/icons/Calendar";
import Bell from "@gravity-ui/icons/Bell";
import Shield from "@gravity-ui/icons/Shield";
import ArrowRightFromSquare from "@gravity-ui/icons/ArrowRightFromSquare";
import Sun from "@gravity-ui/icons/Sun";
import Moon from "@gravity-ui/icons/Moon";
import ArrowChevronLeft from "@gravity-ui/icons/ArrowChevronLeft";
import ArrowChevronRight from "@gravity-ui/icons/ArrowChevronRight";
import ArrowChevronDown from "@gravity-ui/icons/ArrowChevronDown";
import Cube from "@gravity-ui/icons/Cube";
import Tag from "@gravity-ui/icons/Tag";
import ListCheck from "@gravity-ui/icons/ListCheck";
import Puzzle from "@gravity-ui/icons/Puzzle";
import Rocket from "@gravity-ui/icons/Rocket";
import CrownDiamond from "@gravity-ui/icons/CrownDiamond";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import ArrowDownToLine from "@gravity-ui/icons/ArrowDownToLine";
import Receipt from "@gravity-ui/icons/Receipt";
import Briefcase from "@gravity-ui/icons/Briefcase";
import FileDollar from "@gravity-ui/icons/FileDollar";
import FileCheck from "@gravity-ui/icons/FileCheck";
import Layers from "@gravity-ui/icons/Layers";
import { useAuth } from "@/src/features/auth";
import { useOnboarding } from "@/src/features/onboarding";
import { useSubscription } from "@/src/features/subscription";
import {
  accessTitle,
  resolveAccessView,
  type AccessViewKind,
} from "@/src/features/subscription/lib/access-status";
import { isBranchAdminRole, isManagementRole, isOwnerRole, hasEmployeeExperience, roleLabel } from "@/shared/utils/roles";
import { branchDisplayLabel } from "@/shared/utils/auth-user";
import CircleQuestion from "@gravity-ui/icons/CircleQuestion";

const STORAGE_KEY = "scheduly-sidebar-collapsed";
const MODULES_STORAGE_KEY = "scheduly-sidebar-modules";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { width?: number; height?: number }>;

type NavItem = {
  href: string;
  label: string;
  employeeLabel?: string;
  branchAdminLabel?: string;
  icon: IconComponent;
  showBadge?: boolean;
  /** Owner + encargado de sucursal */
  adminOnly?: boolean;
  /** Solo owner central */
  ownerOnly?: boolean;
  /** Solo encargado de sucursal */
  branchAdminOnly?: boolean;
  tourId?: string;
};

type NavModule = {
  id: string;
  label: string;
  icon: IconComponent;
  entitlementKey: string;
  adminOnly?: boolean;
  ownerOnly?: boolean;
  /** Empleados y encargados de sucursal (no owner) */
  employeeExperienceOnly?: boolean;
  items: NavItem[];
};

const navModules: NavModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: House,
    entitlementKey: "operation",
    items: [
      {
        href: appRoutes.dashboard,
        label: "Panel de control",
        icon: House,
        tourId: "nav-dashboard",
      },
    ],
  },
  {
    id: "operation",
    label: "Operación",
    icon: Briefcase,
    entitlementKey: "operation",
    items: [
      {
        href: appRoutes.operation.agenda,
        label: "Agenda",
        icon: Calendar,
        tourId: "nav-agenda",
        employeeLabel: "Mi agenda",
        branchAdminLabel: "Agenda sucursal",
      },
      {
        href: `${appRoutes.operation.agenda}?view=mine`,
        label: "Mi agenda",
        icon: Person,
        branchAdminOnly: true,
      },
      { href: appRoutes.operation.services, label: "Servicios", icon: Gear, tourId: "nav-services" },
      { href: appRoutes.operation.tasks, label: "Tareas", icon: ListCheck, tourId: "nav-tasks" },
      { href: appRoutes.promotions.list, label: "Promociones", icon: Tag, adminOnly: true },
      { href: appRoutes.loyalty.hub, label: "Fidelización", icon: CrownDiamond, adminOnly: true },
    ],
  },
  {
    id: "electronicDocs",
    label: "Documentos electrónicos",
    icon: FileDollar,
    entitlementKey: "electronicDocs",
    ownerOnly: true,
    items: [
      { href: appRoutes.electronicDocs.hub, label: "Centro", icon: Layers, ownerOnly: true },
      { href: appRoutes.electronicDocs.invoices, label: "Facturas", icon: FileDollar, ownerOnly: true },
      { href: appRoutes.electronicDocs.issued, label: "Emitidos", icon: FileCheck, ownerOnly: true },
      {
        href: appRoutes.electronicDocs.sriSettings,
        label: "Configuración SRI",
        icon: Gear,
        ownerOnly: true,
      },
    ],
  },
  {
    id: "employee",
    label: "Mi trabajo",
    icon: Calendar,
    entitlementKey: "operation",
    employeeExperienceOnly: true,
    items: [
      { href: appRoutes.employee.myDay, label: "Mi día", icon: Calendar },
    ],
  },
  {
    id: "finance",
    label: "Finanzas",
    icon: ChartColumn,
    entitlementKey: "admin",
    adminOnly: true,
    items: [
      { href: appRoutes.finance.hub, label: "Centro financiero", icon: ChartColumn, adminOnly: true },
      { href: appRoutes.finance.payroll, label: "Sueldos", icon: Persons, adminOnly: true },
      { href: appRoutes.finance.expenses, label: "Gastos", icon: Receipt, adminOnly: true },
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    icon: ShoppingCart,
    entitlementKey: "sales",
    items: [
      {
        href: appRoutes.sales.register,
        label: "Registrar venta",
        icon: ShoppingCart,
        tourId: "nav-register-sale",
        adminOnly: true,
      },
      {
        href: appRoutes.sales.history,
        label: "Ingresos por turnos",
        icon: Receipt,
        tourId: "nav-sales",
        ownerOnly: true,
      },
      {
        href: appRoutes.sales.productSales,
        label: "Productos vendidos",
        icon: Boxes3,
        ownerOnly: true,
      },
      { href: appRoutes.sales.customers, label: "Clientes", icon: Person, tourId: "nav-customers" },
    ],
  },
  {
    id: "purchases",
    label: "Compras",
    icon: ArrowDownToLine,
    entitlementKey: "purchases",
    adminOnly: true,
    items: [
      {
        href: appRoutes.purchases.register,
        label: "Registrar compra",
        icon: ArrowDownToLine,
        adminOnly: true,
      },
      {
        href: appRoutes.purchases.history,
        label: "Historial de compras",
        icon: Receipt,
        adminOnly: true,
      },
      {
        href: appRoutes.purchases.suppliers,
        label: "Proveedores",
        icon: Person,
        ownerOnly: true,
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventario",
    icon: Boxes3,
    entitlementKey: "inventory",
    items: [
      { href: appRoutes.inventory.products, label: "Productos", icon: Boxes3, tourId: "nav-inventory" },
      { href: appRoutes.branches.stock, label: "Multistock", icon: Layers, adminOnly: true },
      { href: appRoutes.inventory.units, label: "Unidades", icon: Cube },
      { href: appRoutes.inventory.categories, label: "Categorías", icon: Tag, adminOnly: true },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    icon: Shield,
    entitlementKey: "admin",
    ownerOnly: true,
    items: [
      { href: appRoutes.admin.users, label: "Usuarios", icon: Persons, ownerOnly: true },
      { href: appRoutes.admin.roles, label: "Roles", icon: Shield, ownerOnly: true },
      { href: appRoutes.branches.list, label: "Sucursales", icon: House, ownerOnly: true },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    icon: Gear,
    entitlementKey: "system",
    ownerOnly: true,
    items: [
      { href: appRoutes.system.settings, label: "Configuración", icon: Gear, ownerOnly: true },
      { href: appRoutes.system.plans, label: "Planes", icon: Rocket, ownerOnly: true },
      { href: appRoutes.system.modules, label: "Módulos", icon: Puzzle, ownerOnly: true },
      { href: appRoutes.system.profile, label: "Perfil", icon: Person },
      {
        href: appRoutes.system.notifications,
        label: "Notificaciones",
        icon: Bell,
        showBadge: true,
        tourId: "nav-notifications",
        ownerOnly: true,
      },
    ],
  },
];

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

  if (path === appRoutes.dashboard) {
    return pathname === appRoutes.dashboard && !wantedQuery;
  }

  const pathMatches =
    pathname === path || pathname.startsWith(`${path}/`);
  if (!pathMatches) return false;

  // Distinguir /sistema/configuracion vs ?tab=sri
  if (path === appRoutes.system.settings) {
    const onSri = currentSearch.includes("tab=sri");
    if (wantedQuery.includes("tab=sri")) return onSri;
    if (wantedQuery) return currentSearch === wantedQuery;
    return !onSri;
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
      return {
        dot: "bg-danger",
        pill: "bg-danger/15 text-danger",
      };
    case "planned":
      return {
        dot: "bg-warning",
        pill: "bg-warning/20 text-warning",
      };
    case "development":
    case "developer":
      return {
        dot: "bg-accent",
        pill: "bg-accent/15 text-accent",
      };
    default:
      return {
        dot: "bg-muted",
        pill: "bg-surface-secondary text-muted",
      };
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
  const button = (
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
  );

  return (
    <div className="relative w-full" title={collapsed ? title : undefined} data-onboarding={tourId}>
      {button}
      {collapsed && statusLabel && statusKind ? (
        <StatusBadge label={statusLabel} kind={statusKind} compact />
      ) : null}
      {collapsed && !statusLabel && badge != null && badge > 0 ? (
        <span className="pointer-events-none absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString()
    ? `?${searchParams.toString()}`
    : "";
  const router = useRouter();
  const { user, logout } = useAuth();
  const { startTour, startModuleTour, activeModule } = useOnboarding();
  const { getModule, getSectionForPath, isDeveloper, isAppInMaintenance } =
    useSubscription();
  const { setTheme, resolvedTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");

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
        // fallback below
      }
    }

    const defaults: Record<string, boolean> = {};
    for (const mod of navModules) {
      defaults[mod.id] = activeMod === mod.id;
    }
    setOpenModules(defaults);
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
      setOpenModules((prev) => {
        if (
          prev[moduleId] &&
          Object.values(prev).filter(Boolean).length === 1
        ) {
          return prev;
        }
        const next: Record<string, boolean> = {};
        for (const mod of navModules) {
          next[mod.id] = mod.id === moduleId;
        }
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setCollapsed(false);
      localStorage.setItem(STORAGE_KEY, "false");
    };
    window.addEventListener("scheduly:onboarding-expand", onExpand);
    return () => {
      window.removeEventListener("scheduly:onboarding-expand", onExpand);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadUnread = () => {
      fetch(apiUrl(`/api/notifications?userId=${user.id}`))
        .then((r) => r.json())
        .then((items: Array<{ read: boolean }>) =>
          setUnreadCount(items.filter((n) => !n.read).length),
        )
        .catch(() => {});
    };

    loadUnread();
    window.addEventListener("scheduly:notifications-updated", loadUnread);
    return () => {
      window.removeEventListener("scheduly:notifications-updated", loadUnread);
    };
  }, [user, pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

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

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const themeLabel = resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro";
  const isOwner = isOwnerRole(user?.role);
  const isManagement = isManagementRole(user?.role);
  const isBranchAdmin = isBranchAdminRole(user?.role);
  const showEmployeeExperience = hasEmployeeExperience(user?.role);
  const userBranchLabel = branchDisplayLabel(user?.branch, user?.role);

  const visibleModules = navModules
    .filter(
      (mod) =>
        (!mod.ownerOnly || isOwner) &&
        (!mod.adminOnly || isManagement) &&
        (!mod.employeeExperienceOnly || showEmployeeExperience),
    )
    .map((mod) => ({
      ...mod,
      items: mod.items.filter(
        (item) =>
          (!item.ownerOnly || isOwner) &&
          (!item.adminOnly || isManagement) &&
          (!item.branchAdminOnly || isBranchAdmin),
      ),
    }))
    .filter((mod) => mod.items.length > 0);

  const navItemLabel = (item: NavItem) => {
    if (isBranchAdmin && item.branchAdminLabel) return item.branchAdminLabel;
    if (showEmployeeExperience && !isBranchAdmin && item.employeeLabel) {
      return item.employeeLabel;
    }
    return item.label;
  };

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-separator bg-surface transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-[4.5rem]" : "w-64"
      }`}
    >
      <div className="shrink-0 border-b border-separator p-4">
        <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "justify-between gap-2"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3 min-w-0"}`}>
            <div className="shrink-0 rounded-xl bg-accent/10 p-2 text-accent">
              <Calendar width={20} height={20} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight">Scheduly</h1>
                <p className="text-xs text-muted">Gestión de turnos</p>
              </div>
            )}
          </div>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={collapsed ? "Expandir menú" : "Recoger menú"}
            onPress={toggleCollapsed}
          >
            {collapsed ? (
              <ArrowChevronRight width={16} height={16} />
            ) : (
              <ArrowChevronLeft width={16} height={16} />
            )}
          </Button>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {visibleModules.map((mod) => {
          const ModuleIcon = mod.icon;
          const isOpen = collapsed || Boolean(openModules[mod.id]);
          const visibleItems = mod.items;
          const hasActiveChild = visibleItems.some((item) => isRouteActive(pathname, item.href));
          const entitlementModule = getModule(mod.entitlementKey);
          const moduleAccess = entitlementModule
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

          return (
            <div key={mod.id} className="flex flex-col gap-1">
              {collapsed ? (
                <div
                  className={`mb-1 flex items-center justify-center ${hasActiveChild ? "text-accent" : "text-muted"}`}
                  title={moduleStatusLabel ? `${mod.label} · ${moduleStatusLabel}` : mod.label}
                >
                  <ModuleIcon width={16} height={16} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                    hasActiveChild ? "text-accent" : "text-muted hover:text-foreground"
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
                  const badge = item.showBadge ? unreadCount : 0;
                  const { section } = getSectionForPath(pathWithoutQuery(item.href));
                  const sectionAccess = section
                    ? resolveAccessView(section.status, { isDeveloper })
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
                            collapsed
                              ? `${mod.label}: ${displayLabel}`
                              : displayLabel
                          }
                          badge={badge}
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

      <div className="flex shrink-0 flex-col gap-2 border-t border-separator p-3">
        {user && (
          <NavButton
            isActive={pathname === appRoutes.system.profile || pathname.startsWith(`${appRoutes.system.profile}/`)}
            collapsed={collapsed}
            label={
              userBranchLabel
                ? `${user.name} · ${roleLabel(user.role)} · ${userBranchLabel}`
                : `${user.name} · ${roleLabel(user.role)}`
            }
            onPress={() => router.push(appRoutes.system.profile)}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
              {initials}
            </div>
            {!collapsed && (
              <span className="flex min-w-0 flex-1 flex-col truncate text-left leading-tight">
                <span className="truncate">{user.name}</span>
                <span
                  className={`truncate text-[10px] font-semibold uppercase tracking-wide ${
                    isOwner ? "text-accent" : isManagement ? "text-warning" : "text-muted"
                  }`}
                >
                  {roleLabel(user.role)}
                </span>
                {userBranchLabel ? (
                  <span className="truncate text-[10px] font-medium text-muted">
                    {userBranchLabel}
                  </span>
                ) : null}
              </span>
            )}
          </NavButton>
        )}
        {collapsed ? (
          <div title="Guía de esta pantalla" className="w-full" data-onboarding="onboarding-help">
            <Button
              isIconOnly
              variant="ghost"
              className="w-full"
              aria-label="Guía de esta pantalla"
              onPress={() =>
                activeModule ? startModuleTour(activeModule.id) : startTour()
              }
            >
              <CircleQuestion width={16} height={16} />
            </Button>
          </div>
        ) : (
          <div data-onboarding="onboarding-help" className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onPress={() =>
                activeModule ? startModuleTour(activeModule.id) : startTour()
              }
            >
              <CircleQuestion width={16} height={16} />
              {activeModule
                ? `Guía: ${activeModule.label}`
                : "Guía de uso"}
            </Button>
          </div>
        )}
        {collapsed ? (
          <div title={themeLabel} className="w-full">
            <Button
              isIconOnly
              variant="ghost"
              className="w-full"
              aria-label={themeLabel}
              onPress={toggleTheme}
            >
              {resolvedTheme === "dark" ? (
                <Sun width={16} height={16} />
              ) : (
                <Moon width={16} height={16} />
              )}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="justify-start" onPress={toggleTheme}>
            {resolvedTheme === "dark" ? (
              <Sun width={16} height={16} />
            ) : (
              <Moon width={16} height={16} />
            )}
            {themeLabel}
          </Button>
        )}
        {collapsed ? (
          <div title="Cerrar sesión" className="w-full">
            <Button
              isIconOnly
              variant="ghost"
              className="w-full text-danger"
              aria-label="Cerrar sesión"
              onPress={logout}
            >
              <ArrowRightFromSquare width={16} height={16} />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="justify-start text-danger" onPress={logout}>
            <ArrowRightFromSquare width={16} height={16} />
            Cerrar sesión
          </Button>
        )}
      </div>
    </aside>
  );
}

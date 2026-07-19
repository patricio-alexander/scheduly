"use client";

import { usePathname, useRouter } from "next/navigation";
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
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import Briefcase from "@gravity-ui/icons/Briefcase";
import FileDollar from "@gravity-ui/icons/FileDollar";
import File from "@gravity-ui/icons/File";
import FileCheck from "@gravity-ui/icons/FileCheck";
import FileText from "@gravity-ui/icons/FileText";
import Layers from "@gravity-ui/icons/Layers";
import { useAuth } from "@/src/features/auth";
import { useSubscription } from "@/src/features/subscription";
import {
  accessTitle,
  resolveAccessView,
  type AccessViewKind,
} from "@/src/features/subscription/lib/access-status";

const STORAGE_KEY = "scheduly-sidebar-collapsed";
const MODULES_STORAGE_KEY = "scheduly-sidebar-modules";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { width?: number; height?: number }>;

type NavItem = {
  href: string;
  label: string;
  icon: IconComponent;
  showBadge?: boolean;
  adminOnly?: boolean;
};

type NavModule = {
  id: string;
  label: string;
  icon: IconComponent;
  entitlementKey: string;
  adminOnly?: boolean;
  items: NavItem[];
};

const navModules: NavModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: House,
    entitlementKey: "admin",
    items: [{ href: appRoutes.dashboard, label: "Panel de control", icon: House }],
  },
  {
    id: "operation",
    label: "Operación",
    icon: Briefcase,
    entitlementKey: "operation",
    items: [
      { href: appRoutes.operation.agenda, label: "Agenda", icon: Calendar },
      { href: appRoutes.operation.tasks, label: "Tareas", icon: ListCheck },
    ],
  },
  {
    id: "electronicDocs",
    label: "Documentos electrónicos",
    icon: FileDollar,
    entitlementKey: "electronicDocs",
    items: [
      { href: appRoutes.electronicDocs.hub, label: "Centro", icon: Layers },
      { href: appRoutes.electronicDocs.invoices, label: "Facturas", icon: FileDollar },
      { href: appRoutes.electronicDocs.salesNotes, label: "Notas de venta", icon: File },
      { href: appRoutes.electronicDocs.creditNotes, label: "Notas de crédito", icon: FileText },
      { href: appRoutes.electronicDocs.debitNotes, label: "Notas de débito", icon: FileText },
      { href: appRoutes.electronicDocs.withholdings, label: "Retenciones", icon: FileCheck },
      {
        href: appRoutes.electronicDocs.deliveryGuides,
        label: "Guías de remisión",
        icon: File,
      },
      {
        href: appRoutes.electronicDocs.purchaseSettlement,
        label: "Liquidación compras",
        icon: FileDollar,
      },
      { href: appRoutes.electronicDocs.issued, label: "Emitidos", icon: FileCheck },
      {
        href: appRoutes.electronicDocs.sriSettings,
        label: "Configuración SRI",
        icon: Gear,
      },
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    icon: ShoppingCart,
    entitlementKey: "sales",
    items: [
      { href: appRoutes.sales.customers, label: "Clientes", icon: Person },
    ],
  },
  {
    id: "inventory",
    label: "Inventario",
    icon: Boxes3,
    entitlementKey: "inventory",
    items: [
      { href: appRoutes.inventory.products, label: "Productos", icon: Boxes3 },
      { href: appRoutes.inventory.units, label: "Unidades", icon: Cube },
      { href: appRoutes.inventory.categories, label: "Categorías", icon: Tag },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    icon: Shield,
    entitlementKey: "admin",
    items: [
      { href: appRoutes.admin.users, label: "Usuarios", icon: Persons, adminOnly: true },
      { href: appRoutes.admin.roles, label: "Roles", icon: Shield, adminOnly: true },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    icon: Gear,
    entitlementKey: "system",
    items: [
      { href: appRoutes.system.settings, label: "Configuración", icon: Gear },
      { href: appRoutes.system.plans, label: "Planes", icon: Rocket },
      { href: appRoutes.system.modules, label: "Módulos", icon: Puzzle },
      { href: appRoutes.system.profile, label: "Perfil", icon: Person },
      {
        href: appRoutes.system.notifications,
        label: "Notificaciones",
        icon: Bell,
        showBadge: true,
      },
    ],
  },
];

function pathWithoutQuery(href: string) {
  return href.split("?")[0] ?? href;
}

function isRouteActive(pathname: string, href: string) {
  const path = pathWithoutQuery(href);
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
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

  if (collapsed && label) {
    return (
      <div className="relative w-full" title={title}>
        {button}
        {statusLabel && statusKind ? (
          <StatusBadge label={statusLabel} kind={statusKind} compact />
        ) : badge != null && badge > 0 ? (
          <span className="pointer-events-none absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
        ) : null}
      </div>
    );
  }

  return button;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { getModule, getSectionForPath, isDeveloper, isAppInMaintenance } =
    useSubscription();
  const { setTheme, resolvedTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");

    const storedModules = localStorage.getItem(MODULES_STORAGE_KEY);
    if (storedModules) {
      try {
        setOpenModules(JSON.parse(storedModules) as Record<string, boolean>);
        return;
      } catch {
        // fallback below
      }
    }

    const defaults: Record<string, boolean> = {};
    for (const mod of navModules) {
      defaults[mod.id] = mod.items.some((item) => isRouteActive(pathname, item.href));
    }
    setOpenModules(defaults);
  }, []);

  useEffect(() => {
    setOpenModules((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const mod of navModules) {
        if (mod.items.some((item) => isRouteActive(pathname, item.href)) && !next[mod.id]) {
          next[mod.id] = true;
          changed = true;
        }
      }
      if (changed) localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(next));
      return changed ? next : prev;
    });
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    fetch(apiUrl(`/api/notifications?userId=${user.id}`))
      .then((r) => r.json())
      .then((items: Array<{ read: boolean }>) =>
        setUnreadCount(items.filter((n) => !n.read).length),
      )
      .catch(() => {});
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
      const next = { ...prev, [moduleId]: !prev[moduleId] };
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
  const isAdmin = user?.role === "admin";

  const visibleModules = navModules
    .filter((mod) => !mod.adminOnly || isAdmin)
    .map((mod) => ({
      ...mod,
      items: mod.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((mod) => mod.items.length > 0);

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
                    className={`shrink-0 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>
              )}

              {isOpen &&
                visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isRouteActive(pathname, item.href);
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

                  return (
                    <NavButton
                      key={item.href}
                      isActive={isActive}
                      collapsed={collapsed}
                      label={collapsed ? `${mod.label}: ${item.label}` : item.label}
                      badge={badge}
                      statusLabel={sectionStatusLabel}
                      statusKind={sectionStatusKind}
                      nested={!collapsed}
                      onPress={() => router.push(item.href)}
                    >
                      <Icon width={18} height={18} className={collapsed ? "" : "shrink-0"} />
                      {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                    </NavButton>
                  );
                })}
            </div>
          );
        })}
      </nav>

      <div className="flex shrink-0 flex-col gap-2 border-t border-separator p-3">
        {user && (
          <NavButton
            isActive={pathname === appRoutes.system.profile || pathname.startsWith(`${appRoutes.system.profile}/`)}
            collapsed={collapsed}
            label={user.name}
            onPress={() => router.push(appRoutes.system.profile)}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
              {initials}
            </div>
            {!collapsed && <span className="truncate">{user.name}</span>}
          </NavButton>
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

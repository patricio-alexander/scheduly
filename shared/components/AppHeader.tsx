"use client";

import { Dropdown } from "@heroui/react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type Key } from "react";
import Calendar from "@gravity-ui/icons/Calendar";
import ArrowRightFromSquare from "@gravity-ui/icons/ArrowRightFromSquare";
import Sun from "@gravity-ui/icons/Sun";
import Moon from "@gravity-ui/icons/Moon";
import ArrowChevronLeft from "@gravity-ui/icons/ArrowChevronLeft";
import ArrowChevronRight from "@gravity-ui/icons/ArrowChevronRight";
import CircleQuestion from "@gravity-ui/icons/CircleQuestion";
import Bell from "@gravity-ui/icons/Bell";
import Person from "@gravity-ui/icons/Person";
import Gear from "@gravity-ui/icons/Gear";
import ArrowsRotateRight from "@gravity-ui/icons/ArrowsRotateRight";
import { ChangeRoleDialog, useAuth } from "@/src/features/auth";
import { useOnboarding } from "@/src/features/onboarding";
import { START_MODULE_TOUR_EVENT } from "@/src/features/tutorials";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
  isProgrammerRole,
  roleLabel,
} from "@/shared/utils/roles";
import { branchDisplayLabel } from "@/shared/utils/auth-user";
import { APP_BRAND_NAME } from "@/shared/utils/business-profile";

const STORAGE_KEY = "scheduly-sidebar-collapsed";

type AppHeaderProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function AppHeader({ collapsed, onToggleCollapsed }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { startTour } = useOnboarding();
  const { setTheme, resolvedTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [openChangeRol, setOpenChangeRol] = useState(false);

  const startPageGuide = () => {
    // Inicio: mapa del shell (menú / notificaciones / perfil)
    if (pathname === appRoutes.inicio || pathname === "/") {
      startTour();
      return;
    }
    // Resto de pantallas (incl. Configuración): driver.js del módulo
    window.dispatchEvent(new CustomEvent(START_MODULE_TOUR_EVENT));
  };

  useEffect(() => {
    if (!user) return;
    const loadUnread = () => {
      const personKey = user.personId ?? user.id;
      fetch(apiUrl(`/api/notifications?userId=${personKey}`))
        .then((r) => r.json())
        .then((items: Array<{ read: boolean }>) => {
          if (!Array.isArray(items)) {
            setUnreadCount(0);
            return;
          }
          setUnreadCount(items.filter((n) => !n.read).length);
        })
        .catch(() => {});
    };
    loadUnread();
    window.addEventListener("scheduly:notifications-updated", loadUnread);
    return () => {
      window.removeEventListener("scheduly:notifications-updated", loadUnread);
    };
  }, [user, pathname]);

  const isOwner = isOwnerRole(user?.role);
  const isManagement = isManagementRole(user?.role);
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userBranchLabel = branchDisplayLabel(user?.branch, user?.role);
  const hasLinkedBranch = Boolean(user?.branch?.id);
  const branchNeedsLink =
    !isOwnerRole(user?.role) && !isProgrammerRole(user?.role);
  const themeLabel = resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro";
  const hasMultipleRoles = (user?.roles?.length ?? 0) > 1;

  const menuItems = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      icon: typeof Person;
      danger?: boolean;
    }> = [{ id: "profile", label: "Perfil", icon: Person }];
    if (isOwner || isManagement) {
      items.push({ id: "settings", label: "Configuración", icon: Gear });
    }
    if (hasMultipleRoles) {
      items.push({
        id: "change-role",
        label: "Cambiar rol",
        icon: ArrowsRotateRight,
      });
    }
    items.push({
      id: "logout",
      label: "Cerrar sesión",
      icon: ArrowRightFromSquare,
      danger: true,
    });
    return items;
  }, [hasMultipleRoles, isManagement, isOwner]);

  const onUserMenuAction = (key: Key) => {
    switch (String(key)) {
      case "profile":
        router.push(appRoutes.system.profile);
        break;
      case "settings":
        router.push(appRoutes.system.settings);
        break;
      case "change-role":
        setOpenChangeRol(true);
        break;
      case "logout":
        void (async () => {
          try {
            await logout();
          } catch {
            // igual forzamos salida
          }
          // Navegación dura: aplica Set-Cookie y evita estado React viejo
          window.location.assign(apiUrl(appRoutes.login));
        })();
        break;
      default:
        break;
    }
  };

  return (
    <header className="scheduly-navbar z-40 flex h-14 shrink-0 items-center gap-2 px-3 sm:px-4">
      <button
        type="button"
        className="scheduly-navbar__icon-btn"
        aria-label={collapsed ? "Expandir menú" : "Recoger menú"}
        onClick={onToggleCollapsed}
      >
        {collapsed ? (
          <ArrowChevronRight width={16} height={16} />
        ) : (
          <ArrowChevronLeft width={16} height={16} />
        )}
      </button>

      <button
        type="button"
        className="scheduly-navbar__brand min-w-0 px-1 py-1"
        data-onboarding="shell-brand"
        onClick={() => router.push(appRoutes.inicio)}
      >
        <span className="scheduly-navbar__brand-mark h-8 w-8">
          <Calendar width={18} height={18} />
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="scheduly-navbar__brand-title block text-sm">
            {APP_BRAND_NAME}
          </span>
          <span className="scheduly-navbar__brand-sub">
            Gestión de turnos
          </span>
        </span>
      </button>

      <div className="ml-1 min-w-0 flex-1">
        {user ? (
          <div
            className={`scheduly-navbar__chip ${
              hasLinkedBranch
                ? "scheduly-navbar__chip--success"
                : branchNeedsLink
                  ? "scheduly-navbar__chip--danger"
                  : ""
            }`}
            title={
              hasLinkedBranch
                ? `Sucursal vinculada: ${userBranchLabel}`
                : branchNeedsLink
                  ? "Sin sucursal vinculada: solo verás datos de tu local cuando te asignen una"
                  : "Dueño / Programador: acceso global (sin filtro de sucursal)"
            }
            data-onboarding="header-branch"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                hasLinkedBranch
                  ? "bg-success"
                  : branchNeedsLink
                    ? "bg-danger"
                    : "bg-muted"
              }`}
              aria-hidden
            />
            <span className="truncate">
              {hasLinkedBranch
                ? userBranchLabel
                : branchNeedsLink
                  ? "Sin sucursal"
                  : "Todas las sucursales"}
            </span>
          </div>
        ) : null}
      </div>

      <div className="scheduly-navbar__actions">
        <button
          type="button"
          className="scheduly-navbar__icon-btn"
          aria-label="Guía de uso"
          data-onboarding="onboarding-help"
          onClick={startPageGuide}
        >
          <CircleQuestion width={16} height={16} />
        </button>
        <button
          type="button"
          className="scheduly-navbar__icon-btn relative"
          aria-label={
            unreadCount > 0
              ? `Notificaciones (${unreadCount} sin leer)`
              : "Notificaciones"
          }
          data-onboarding="nav-notifications"
          onClick={() => router.push(appRoutes.system.notifications)}
        >
          <Bell width={16} height={16} />
          {unreadCount > 0 ? (
            <span className="scheduly-navbar__badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="scheduly-navbar__icon-btn"
          aria-label={themeLabel}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? (
            <Sun width={16} height={16} />
          ) : (
            <Moon width={16} height={16} />
          )}
        </button>

        {user ? (
          <>
            <Dropdown>
              <Dropdown.Trigger
                id="user-menu-button"
                aria-label="Menú de usuario"
                data-onboarding="nav-user-menu"
                className="scheduly-navbar__brand max-w-[220px] px-2 py-1.5 outline-none data-[pressed]:bg-surface-secondary"
              >
                <span className="scheduly-navbar__brand-mark h-7 w-7 rounded-full text-[10px] font-bold">
                  {initials}
                </span>
                <span className="hidden min-w-0 flex-col truncate leading-tight lg:flex">
                  <span className="truncate text-xs font-medium">{user.name}</span>
                  <span
                    className={`truncate text-[10px] font-semibold uppercase ${
                      isOwner
                        ? "text-accent"
                        : isBranchAdminRole(user.role)
                          ? "text-warning"
                          : "text-muted"
                    }`}
                  >
                    {roleLabel(user.role)}
                  </span>
                </span>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end" className="min-w-[200px]">
                <Dropdown.Menu
                  aria-label="Opciones de cuenta"
                  onAction={onUserMenuAction}
                >
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Dropdown.Item
                        key={item.id}
                        id={item.id}
                        textValue={item.label}
                        className={
                          item.danger
                            ? "gap-2 text-danger"
                            : "gap-2"
                        }
                      >
                        <Icon width={16} height={16} />
                        {item.label}
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            <ChangeRoleDialog
              open={openChangeRol}
              onClose={() => setOpenChangeRol(false)}
            />
          </>
        ) : null}
      </div>
    </header>
  );
}

export { STORAGE_KEY as SIDEBAR_COLLAPSED_KEY };

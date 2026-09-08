"use client";

import { Button, Dropdown } from "@heroui/react";
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
import Puzzle from "@gravity-ui/icons/Puzzle";
import ArrowsRotateRight from "@gravity-ui/icons/ArrowsRotateRight";
import { ChangeRoleDialog, useAuth } from "@/src/features/auth";
import { useOnboarding } from "@/src/features/onboarding";
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
import { quickAccessItems } from "@/shared/components/nav-config";

const STORAGE_KEY = "scheduly-sidebar-collapsed";

type AppHeaderProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function AppHeader({ collapsed, onToggleCollapsed }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { startTour, startModuleTour, activeModule } = useOnboarding();
  const { setTheme, resolvedTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [openChangeRol, setOpenChangeRol] = useState(false);

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
  const isProgrammer = isProgrammerRole(user?.role);
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userBranchLabel = branchDisplayLabel(user?.branch, user?.role);
  const themeLabel = resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro";
  const hasMultipleRoles = (user?.roles?.length ?? 0) > 1;

  const visibleQuick = isProgrammer
    ? []
    : quickAccessItems.filter(
        (item) => !item.adminOnly || isManagement || isOwner,
      );

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
    if (isOwner) {
      items.push({ id: "modules", label: "Módulos", icon: Puzzle });
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
      case "modules":
        router.push(appRoutes.system.modules);
        break;
      case "change-role":
        setOpenChangeRol(true);
        break;
      case "logout":
        logout();
        router.push(appRoutes.login);
        break;
      default:
        break;
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-separator bg-surface px-3 sm:px-4">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={collapsed ? "Expandir menú" : "Recoger menú"}
        onPress={onToggleCollapsed}
      >
        {collapsed ? (
          <ArrowChevronRight width={16} height={16} />
        ) : (
          <ArrowChevronLeft width={16} height={16} />
        )}
      </Button>

      <button
        type="button"
        className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-surface-secondary"
        onClick={() =>
          router.push(
            isProgrammer ? appRoutes.system.logs : appRoutes.dashboard,
          )
        }
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Calendar width={18} height={18} />
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-bold leading-tight tracking-tight">
            {APP_BRAND_NAME}
          </span>
          <span className="block truncate text-[10px] text-muted leading-tight">
            Gestión de turnos
          </span>
        </span>
      </button>

      <nav className="ml-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {visibleQuick.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Button
              key={item.href}
              size="sm"
              variant={active ? "secondary" : "ghost"}
              className={`relative shrink-0 ${active ? "font-semibold" : ""}`}
              data-onboarding={item.tourId}
              onPress={() => router.push(item.href)}
            >
              <Icon width={16} height={16} />
              <span className="hidden md:inline">{item.label}</span>
            </Button>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Guía de uso"
          data-onboarding="onboarding-help"
          onPress={() =>
            activeModule ? startModuleTour(activeModule.id) : startTour()
          }
        >
          <CircleQuestion width={16} height={16} />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={
            unreadCount > 0
              ? `Notificaciones (${unreadCount} sin leer)`
              : "Notificaciones"
          }
          data-onboarding="nav-notifications"
          className="relative"
          onPress={() => router.push(appRoutes.system.notifications)}
        >
          <Bell width={16} height={16} />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={themeLabel}
          onPress={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? (
            <Sun width={16} height={16} />
          ) : (
            <Moon width={16} height={16} />
          )}
        </Button>

        {user ? (
          <>
            <Dropdown>
              <Dropdown.Trigger
                id="user-menu-button"
                aria-label="Menú de usuario"
                className="flex max-w-[220px] items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-surface-secondary data-[pressed]:bg-surface-secondary"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
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
                    {userBranchLabel ? ` · ${userBranchLabel}` : ""}
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

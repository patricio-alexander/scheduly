"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { apiUrl } from "@/shared/utils/api";
import House from "@gravity-ui/icons/House";
import Person from "@gravity-ui/icons/Person";
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
import { useAuth } from "@/src/features/auth";

const STORAGE_KEY = "scheduly-sidebar-collapsed";

const navItems = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/customers", label: "Clientes", icon: Person },
  { href: "/services", label: "Servicios", icon: Gear },
  { href: "/products", label: "Productos", icon: Boxes3 },
  { href: "/notifications", label: "Notificaciones", icon: Bell, showBadge: true },
];

function NavButton({
  isActive,
  onPress,
  collapsed,
  label,
  badge,
  children,
}: {
  isActive: boolean;
  onPress: () => void;
  collapsed?: boolean;
  label?: string;
  badge?: number;
  children: ReactNode;
}) {
  const button = (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={`relative w-full ${collapsed ? "justify-center px-0" : "justify-start"} ${isActive ? "font-medium" : ""}`}
      onPress={onPress}
      aria-label={label}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
      )}
      {children}
      {!collapsed && badge != null && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Button>
  );

  if (collapsed && label) {
    return (
      <div className="relative w-full" title={label}>
        {button}
        {badge != null && badge > 0 && (
          <span className="pointer-events-none absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
        )}
      </div>
    );
  }

  return button;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

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

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const badge = item.showBadge ? unreadCount : 0;
          return (
            <NavButton
              key={item.href}
              isActive={isActive}
              collapsed={collapsed}
              label={item.label}
              badge={badge}
              onPress={() => router.push(item.href)}
            >
              <Icon width={18} height={18} className={collapsed ? "" : "shrink-0"} />
              {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
            </NavButton>
          );
        })}
        {user?.role === "admin" && (
          <NavButton
            isActive={pathname === "/users"}
            collapsed={collapsed}
            label="Usuarios"
            onPress={() => router.push("/users")}
          >
            <Shield width={18} height={18} />
            {!collapsed && <span className="flex-1 truncate text-left">Usuarios</span>}
          </NavButton>
        )}
      </nav>

      <div className="flex shrink-0 flex-col gap-2 border-t border-separator p-3">
        {user && (
          <NavButton
            isActive={pathname === "/profile"}
            collapsed={collapsed}
            label={user.name}
            onPress={() => router.push("/profile")}
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

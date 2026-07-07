"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { apiUrl } from "@/shared/utils/api";
import House from "@gravity-ui/icons/House";
import Person from "@gravity-ui/icons/Person";
import Gear from "@gravity-ui/icons/Gear";
import Calendar from "@gravity-ui/icons/Calendar";
import Bell from "@gravity-ui/icons/Bell";
import Shield from "@gravity-ui/icons/Shield";
import ArrowRightFromSquare from "@gravity-ui/icons/ArrowRightFromSquare";
import Sun from "@gravity-ui/icons/Sun";
import Moon from "@gravity-ui/icons/Moon";
import { useAuth } from "@/src/features/auth";

const navItems = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/customers", label: "Clientes", icon: Person },
  { href: "/services", label: "Servicios", icon: Gear },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/notifications", label: "Notificaciones", icon: Bell, showBadge: true },
];

function NavButton({
  isActive,
  onPress,
  children,
}: {
  isActive: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={`justify-start relative ${isActive ? "font-medium" : ""}`}
      onPress={onPress}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-accent" />
      )}
      {children}
    </Button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch(apiUrl(`/api/notifications?userId=${user.id}`))
      .then((r) => r.json())
      .then((items: Array<{ read: boolean }>) =>
        setUnreadCount(items.filter((n) => !n.read).length),
      )
      .catch(() => {});
  }, [user, pathname]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-surface border-r border-separator">
      <div className="shrink-0 p-6 border-b border-separator">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 rounded-xl p-2 text-accent">
            <Calendar width={20} height={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Scheduly</h1>
            <p className="text-xs text-muted">Gestión de turnos</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const badge = item.showBadge ? unreadCount : 0;
          return (
            <NavButton key={item.href} isActive={isActive} onPress={() => router.push(item.href)}>
              <Icon width={18} height={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </NavButton>
          );
        })}
        {user?.role === "admin" && (
          <NavButton isActive={pathname === "/users"} onPress={() => router.push("/users")}>
            <Shield width={18} height={18} />
            Usuarios
          </NavButton>
        )}
      </nav>

      <div className="shrink-0 p-4 border-t border-separator flex flex-col gap-2">
        {user && (
          <NavButton isActive={pathname === "/profile"} onPress={() => router.push("/profile")}>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
              {initials}
            </div>
            <span className="truncate">{user.name}</span>
          </NavButton>
        )}
        <Button variant="ghost" className="justify-start" onPress={toggleTheme}>
          {resolvedTheme === "dark" ? (
            <Sun width={16} height={16} />
          ) : (
            <Moon width={16} height={16} />
          )}
          {resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}
        </Button>
        <Button variant="ghost" className="justify-start text-danger" onPress={logout}>
          <ArrowRightFromSquare width={16} height={16} />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}

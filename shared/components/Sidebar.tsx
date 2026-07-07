"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
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
  { href: "/notifications", label: "Notificaciones", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <aside className="w-64 min-h-screen bg-surface border-r border-separator flex flex-col">
      <div className="p-6 border-b border-separator">
        <h1 className="text-xl font-bold">Scheduly</h1>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className="justify-start"
              onPress={() => router.push(item.href)}
            >
              <Icon width={18} height={18} />
              {item.label}
            </Button>
          );
        })}
        {user?.role === "admin" && (
          <Button
            variant={pathname === "/users" ? "secondary" : "ghost"}
            className="justify-start"
            onPress={() => router.push("/users")}
          >
            <Shield width={18} height={18} />
            Usuarios
          </Button>
        )}
      </nav>

      <div className="p-4 border-t border-separator flex flex-col gap-2">
        {user && (
          <>
            <Button
              variant={pathname === "/profile" ? "secondary" : "ghost"}
              className="justify-start"
              onPress={() => router.push("/profile")}
            >
              <Person width={18} height={18} />
              {user.name}
            </Button>
          </>
        )}
        <Button variant="ghost" className="justify-start" onPress={toggleTheme}>
          {resolvedTheme === "dark" ? (
            <Sun width={16} height={16} />
          ) : (
            <Moon width={16} height={16} />
          )}
          {resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}
        </Button>
        <Button variant="ghost" className="justify-start" onPress={logout}>
          <ArrowRightFromSquare width={16} height={16} />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}

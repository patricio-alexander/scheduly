"use client";

import { useAuth } from "@/src/features/auth";
import { NotificationsList, type NotificationItem } from "@/src/features/notifications";
import { apiUrl } from "@/shared/utils/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Bell from "@gravity-ui/icons/Bell";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch(apiUrl(`/api/notifications?userId=${user.id}`))
      .then((r) => r.json())
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, [user]);

  const handleMarkRead = useCallback(async (id: number) => {
    await fetch(apiUrl(`/api/notifications/${id}?userId=${user!.id}`), { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="bg-accent/10 rounded-xl p-3">
          <Bell width={24} height={24} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-muted text-sm">
            {unreadCount > 0
              ? `Tienes ${unreadCount} notificaciones sin leer`
              : "No tienes notificaciones pendientes"}
          </p>
        </div>
      </div>

      <NotificationsList
        notifications={notifications}
        onMarkRead={handleMarkRead}
        loading={loading}
      />
    </div>
  );
}

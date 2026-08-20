"use client";

import { useAuth } from "@/src/features/auth";
import { NotificationsList, type NotificationItem } from "@/src/features/notifications";
import { apiUrl } from "@/shared/utils/api";
import { PageHeader } from "@/shared/components/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@heroui/react";
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
    fetch(apiUrl(`/api/notifications?userId=${user.personId ?? user.id}`))
      .then(async (r) => {
        if (!r.ok) return [];
        const data: unknown = await r.json();
        return Array.isArray(data) ? (data as NotificationItem[]) : [];
      })
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, [user]);

  const handleMarkRead = useCallback(async (id: number) => {
    if (!user) return;
    const res = await fetch(
      apiUrl(`/api/notifications/${id}?userId=${user.personId ?? user.id}`),
      { method: "PATCH" },
    );
    if (!res.ok) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    window.dispatchEvent(new Event("scheduly:notifications-updated"));
  }, [user]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.read);
    const results = await Promise.all(
      unread.map((n) =>
        fetch(apiUrl(`/api/notifications/${n.id}?userId=${user.personId ?? user.id}`), {
          method: "PATCH",
        }),
      ),
    );
    if (results.some((r) => !r.ok)) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    window.dispatchEvent(new Event("scheduly:notifications-updated"));
  }, [notifications, user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (authLoading) return null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div data-onboarding="notif-header">
        <PageHeader
          icon={<Bell width={24} height={24} />}
          title="Notificaciones"
          description={
            unreadCount > 0
              ? `Tienes ${unreadCount} notificación${unreadCount === 1 ? "" : "es"} sin leer`
              : "Estás al día con todas tus notificaciones"
          }
          action={
            unreadCount > 0 ? (
              <Button variant="secondary" size="sm" onPress={handleMarkAllRead}>
                Marcar todas como leídas
              </Button>
            ) : undefined
          }
        />
      </div>

      <div data-onboarding="notif-list">
        <NotificationsList
          notifications={notifications}
          onMarkRead={handleMarkRead}
          loading={loading}
        />
      </div>
    </div>
  );
}

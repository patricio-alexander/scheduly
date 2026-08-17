"use client";

import { useAuth } from "@/src/features/auth";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { Button } from "@heroui/react";
import Bell from "@gravity-ui/icons/Bell";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import CircleInfo from "@gravity-ui/icons/CircleInfo";
import CircleXmark from "@gravity-ui/icons/CircleXmark";
import TriangleExclamation from "@gravity-ui/icons/TriangleExclamation";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationItem } from "../types";

const PREVIEW_LIMIT = 5;
const STORAGE_KEY = "scheduly.notifications.panel.open";
const REFRESH_MS = 30_000;

const typeIcon = {
  info: CircleInfo,
  success: CircleCheck,
  warning: TriangleExclamation,
  error: CircleXmark,
} as const;

const typeIconColor = {
  info: "text-muted",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
} as const;

function isInventoryNotification(n: NotificationItem) {
  if (n.link?.includes("/inventario/productos")) return true;
  return (
    n.type === "warning" &&
    (n.title.startsWith("Stock bajo:") || n.title.startsWith("Sin stock:"))
  );
}

function notificationHref(n: NotificationItem) {
  if (n.link) return n.link;
  if (isInventoryNotification(n)) {
    const name = n.title.replace(/^(Stock bajo|Sin stock):\s*/i, "").trim();
    if (name) {
      return `${appRoutes.inventory.products}?q=${encodeURIComponent(name)}`;
    }
    return appRoutes.inventory.products;
  }
  return appRoutes.system.notifications;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

export function UnreadNotificationsFloat() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const prevCountRef = useRef(0);
  const initialLoadRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const setOpenPersist = useCallback((value: boolean) => {
    setOpen(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    audioRef.current = new Audio(apiUrl("/notification.mp3"));
    audioRef.current.preload = "auto";
    audioRef.current.volume = 0.8;

    try {
      setOpen(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // ignore
    }
    setReady(true);

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(apiUrl(`/api/notifications?userId=${user.id}`));
      if (!res.ok) return;
      const data = (await res.json()) as NotificationItem[];
      if (!Array.isArray(data)) return;
      const unread = data.filter((n) => !n.read);
      const hasNewNotifications =
        !initialLoadRef.current && unread.length > prevCountRef.current;
      if (hasNewNotifications) {
        setOpenPersist(true);
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          void audio.play().catch(() => {
            // El navegador puede bloquear audio hasta la primera interacción.
          });
        }
      }
      initialLoadRef.current = false;
      prevCountRef.current = unread.length;
      setItems(unread);
      if (unread.length === 0) {
        setOpenPersist(false);
      }
    } catch {
      // silent
    }
  }, [user, setOpenPersist]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    const onFocus = () => void load();
    const onUpdated = () => void load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("scheduly:notifications-updated", onUpdated);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("scheduly:notifications-updated", onUpdated);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpenPersist(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPersist(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpenPersist]);

  const markRead = async (id: number) => {
    if (!user) return false;
    const previous = items;
    setItems((prev) => {
      const next = prev.filter((n) => n.id !== id);
      prevCountRef.current = next.length;
      return next;
    });
    try {
      const res = await fetch(
        apiUrl(`/api/notifications/${id}?userId=${user.id}`),
        { method: "PATCH" },
      );
      if (!res.ok) {
        setItems(previous);
        prevCountRef.current = previous.length;
        return false;
      }
      window.dispatchEvent(new Event("scheduly:notifications-updated"));
      return true;
    } catch {
      setItems(previous);
      prevCountRef.current = previous.length;
      return false;
    }
  };

  const markAllRead = async () => {
    if (!user || items.length === 0) return;
    const previous = items;
    const ids = items.map((n) => n.id);
    prevCountRef.current = 0;
    setItems([]);
    setOpenPersist(false);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(apiUrl(`/api/notifications/${id}?userId=${user.id}`), {
            method: "PATCH",
          }),
        ),
      );
      if (results.some((r) => !r.ok)) {
        setItems(previous);
        prevCountRef.current = previous.length;
        return;
      }
      window.dispatchEvent(new Event("scheduly:notifications-updated"));
    } catch {
      setItems(previous);
      prevCountRef.current = previous.length;
    }
  };

  const openNotification = async (n: NotificationItem) => {
    const href = notificationHref(n);
    await markRead(n.id);
    setOpenPersist(false);
    router.push(href);
  };

  if (
    !ready ||
    !user ||
    items.length === 0 ||
    pathname === appRoutes.system.notifications
  ) {
    return null;
  }

  const preview = items.slice(0, PREVIEW_LIMIT);
  const extra = items.length - preview.length;

  return (
    <div
      ref={panelRef}
      className="pointer-events-none fixed top-3 right-3 z-50 sm:top-4 sm:right-4"
    >
      <div className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => setOpenPersist(!open)}
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl border bg-surface shadow-md shadow-black/8 transition hover:border-accent/40 hover:bg-accent/5 ${
            open ? "border-accent/50 ring-2 ring-accent/20" : "border-separator"
          }`}
          aria-label={`${items.length} notificaciones sin leer`}
          aria-expanded={open}
        >
          <Bell width={18} height={18} className="text-accent" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        </button>

        {open ? (
          <aside
            className="absolute right-0 top-[calc(100%+0.5rem)] flex w-[min(calc(100vw-1.5rem),20rem)] flex-col overflow-hidden rounded-2xl border border-separator bg-surface shadow-xl shadow-black/15"
            role="region"
            aria-label="Notificaciones sin leer"
          >
            <div className="border-b border-separator px-4 py-3">
              <p className="text-sm font-semibold">{items.length} sin leer</p>
              <p className="text-[11px] text-muted">Inventario y actividad reciente</p>
            </div>

            <ul className="max-h-80 divide-y divide-separator overflow-y-auto">
              {preview.map((n) => {
                const Icon = isInventoryNotification(n)
                  ? Boxes3
                  : (typeIcon[n.type] ?? Bell);

                return (
                  <li key={n.id} className="group relative bg-surface">
                    <button
                      type="button"
                      onClick={() => void openNotification(n)}
                      className="flex w-full items-start gap-3 px-4 py-3 pr-14 text-left transition hover:bg-surface-secondary/60"
                    >
                      <span
                        className={`mt-0.5 shrink-0 ${typeIconColor[n.type] ?? "text-muted"}`}
                      >
                        <Icon width={16} height={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{n.title}</span>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs text-muted">
                          {n.message}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted">
                          {formatRelative(n.createdAt)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted opacity-0 transition hover:bg-surface-secondary hover:text-foreground group-hover:opacity-100"
                    >
                      Leída
                    </button>
                  </li>
                );
              })}
            </ul>

            {extra > 0 ? (
              <p className="border-t border-separator px-4 py-2 text-center text-[11px] text-muted">
                +{extra} más sin leer
              </p>
            ) : null}

            <div className="flex items-center gap-2 border-t border-separator bg-surface-secondary/40 px-3 py-2.5">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                onPress={() => void markAllRead()}
              >
                Marcar todas
              </Button>
              <button
                type="button"
                onClick={() => {
                  setOpenPersist(false);
                  router.push(appRoutes.system.notifications);
                }}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-xl border border-separator bg-surface px-3 text-sm font-medium transition hover:bg-surface-secondary"
              >
                Ver todas
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

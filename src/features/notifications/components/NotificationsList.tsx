"use client";

import { Button, Chip } from "@heroui/react";
import type { NotificationItem } from "../types";
import Bell from "@gravity-ui/icons/Bell";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import TriangleExclamation from "@gravity-ui/icons/TriangleExclamation";
import CircleXmark from "@gravity-ui/icons/CircleXmark";
import Info from "@gravity-ui/icons/CircleInfo";
import { ComponentProps } from "react";

const typeIcon = {
  info: Info,
  success: CircleCheck,
  warning: TriangleExclamation,
  error: CircleXmark,
};

const typeColor: Record<
  NotificationItem["type"],
  ComponentProps<typeof Chip>["color"]
> = {
  info: "default",
  success: "success",
  warning: "warning",
  error: "danger",
};

interface Props {
  notifications: NotificationItem[];
  onMarkRead: (id: number) => Promise<void>;
  loading?: boolean;
}

export function NotificationsList({
  notifications,
  onMarkRead,
  loading,
}: Props) {
  if (loading) {
    return <p className="text-muted text-sm">Cargando...</p>;
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted">
        <Bell width={40} height={40} />
        <p className="text-sm">No tienes notificaciones</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {notifications.map((n) => {
        const Icon = typeIcon[n.type] ?? Bell;
        const color = typeColor[n.type];

        return (
          <div
            key={n.id}
            className={`bg-surface rounded-xl border p-4 flex items-start gap-3 transition-opacity ${n.read ? "opacity-60" : "border-separator"}`}
          >
            <div
              className={`shrink-0 mt-0.5 ${n.read ? "text-muted" : `text-${color}`}`}
            >
              <Icon width={20} height={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p
                  className={`text-sm font-medium truncate ${n.read ? "text-muted" : ""}`}
                >
                  {n.title}
                </p>
                {!n.read && (
                  <Chip color={color} variant="soft" size="sm">
                    Nueva
                  </Chip>
                )}
              </div>
              <p className="text-xs text-muted">{n.message}</p>
              <p className="text-xs text-muted mt-1">
                {new Date(n.createdAt).toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {!n.read && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onPress={() => onMarkRead(n.id)}
              >
                Marcar leída
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

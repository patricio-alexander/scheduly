"use client";

import { Button, Chip } from "@heroui/react";
import type { NotificationItem } from "../types";
import Bell from "@gravity-ui/icons/Bell";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import TriangleExclamation from "@gravity-ui/icons/TriangleExclamation";
import CircleXmark from "@gravity-ui/icons/CircleXmark";
import Info from "@gravity-ui/icons/CircleInfo";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import { ComponentProps } from "react";
import { ContentCard, EmptyState, Skeleton } from "@/shared/components/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

const typeIconColor: Record<NotificationItem["type"], string> = {
  info: "text-muted",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
};

interface Props {
  notifications: NotificationItem[];
  onMarkRead: (id: number) => Promise<void>;
  loading?: boolean;
}

function NotificationSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-separator p-4 flex gap-3">
          <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsList({
  notifications,
  onMarkRead,
  loading,
}: Props) {
  const router = useRouter();

  if (loading) {
    return <NotificationSkeleton />;
  }

  if (notifications.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Bell width={40} height={40} />}
          title="No tienes notificaciones"
          description="Cuando haya actividad en tu agenda, aparecerá aquí."
        />
      </ContentCard>
    );
  }

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const openLinked = async (n: NotificationItem) => {
    if (!n.read) await onMarkRead(n.id);
    if (n.link) router.push(n.link);
  };

  const renderNotification = (n: NotificationItem) => {
    const Icon = typeIcon[n.type] ?? Bell;
    const color = typeColor[n.type];

    return (
      <div
        key={n.id}
        className={`rounded-2xl border p-4 flex items-start gap-3 transition-colors ${
          n.read
            ? "border-separator/60 bg-surface-secondary/30 opacity-75"
            : "border-separator bg-surface shadow-sm"
        }`}
      >
        <div className={`shrink-0 mt-0.5 ${n.read ? "text-muted" : typeIconColor[n.type]}`}>
          <Icon width={20} height={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-medium truncate ${n.read ? "text-muted" : ""}`}>
              {n.title}
            </p>
            {!n.read && (
              <Chip color={color} variant="soft" size="sm">
                Nueva
              </Chip>
            )}
          </div>
          <p className="text-sm text-muted">{n.message}</p>
          <p className="text-xs text-muted mt-2">
            {new Date(n.createdAt).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
          {n.link ? (
            <button
              type="button"
              onClick={() => void openLinked(n)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              Ver producto
              <ArrowRight width={12} height={12} />
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {!n.read && (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => void onMarkRead(n.id)}
            >
              Marcar leída
            </Button>
          )}
          {n.link ? (
            <Link
              href={n.link}
              onClick={() => {
                if (!n.read) void onMarkRead(n.id);
              }}
              className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-xs font-medium text-accent hover:bg-accent/10"
            >
              Ir
            </Link>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {unread.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            Sin leer ({unread.length})
          </h2>
          {unread.map(renderNotification)}
        </section>
      )}
      {read.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            Anteriores
          </h2>
          {read.map(renderNotification)}
        </section>
      )}
    </div>
  );
}

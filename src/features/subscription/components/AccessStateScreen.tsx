"use client";

import type { ReactNode } from "react";
import Wrench from "@gravity-ui/icons/Wrench";
import Rocket from "@gravity-ui/icons/Rocket";
import Code from "@gravity-ui/icons/Code";
import Lock from "@gravity-ui/icons/Lock";
import CreditCard from "@gravity-ui/icons/CreditCard";
import type { AccessViewKind } from "../lib/access-status";

const icons = {
  maintenance: Wrench,
  planned: Rocket,
  development: Code,
  developer: Lock,
  unsubscribed: CreditCard,
} as const;

export function AccessStateScreen({
  kind,
  title,
  description,
  error,
  action,
}: {
  kind: Exclude<AccessViewKind, "ok">;
  title: string;
  description: string;
  error?: string | null;
  action?: ReactNode;
}) {
  const Icon = icons[kind];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-2xl bg-accent/10 p-4 text-accent">
        <Icon width={32} height={32} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {error ? (
        <p className="mt-3 max-w-md text-sm text-danger">{error}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

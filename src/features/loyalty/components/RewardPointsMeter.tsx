"use client";

import { Label, Meter } from "@heroui/react";

export function rewardPointsProgress(currentPoints: number, pointsCost: number) {
  const safeCost = Math.max(1, pointsCost);
  const pct = Math.min(100, Math.round((currentPoints / safeCost) * 100));
  const remaining = Math.max(0, pointsCost - currentPoints);
  const canRedeem = currentPoints >= pointsCost;
  return { pct, remaining, canRedeem };
}

export function RewardPointsMeter({
  currentPoints,
  pointsCost,
  label,
  className,
}: {
  currentPoints: number;
  pointsCost: number;
  label?: string;
  className?: string;
}) {
  const { pct, remaining, canRedeem } = rewardPointsProgress(
    currentPoints,
    pointsCost,
  );

  return (
    <Meter
      aria-label={label ?? "Progreso hacia el premio"}
      className={className ?? "w-full"}
      value={pct}
    >
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium text-muted">
          {canRedeem
            ? "¡Ya puedes canjearlo!"
            : `Te faltan ${remaining} punto${remaining === 1 ? "" : "s"}`}
        </Label>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {currentPoints} / {pointsCost} pts ({pct}%)
        </span>
      </div>
      <Meter.Track className="mt-2 h-2">
        <Meter.Fill className={canRedeem ? "bg-accent" : undefined} />
      </Meter.Track>
    </Meter>
  );
}

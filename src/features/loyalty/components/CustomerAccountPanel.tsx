"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, toast, useOverlayState } from "@heroui/react";
import CrownDiamond from "@gravity-ui/icons/CrownDiamond";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { formatRewardApplyLabel } from "@/shared/utils/reward-apply";
import { RewardPointsMeter } from "./RewardPointsMeter";
import {
  fetchCustomerAccount,
  redeemReward,
} from "../services/loyalty-service";
import type { CustomerPointTransaction, LoyaltyReward } from "../types";
import { useCustomerAuth } from "../hooks/useCustomerAuth";

const tierLabel: Record<string, string> = {
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CustomerAccountPanel({
  onLogout,
}: {
  onLogout?: () => void;
}) {
  const { customer, logout, refresh } = useCustomerAuth();
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [transactions, setTransactions] = useState<CustomerPointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
  const [redeemTarget, setRedeemTarget] = useState<LoyaltyReward | null>(null);
  const confirmState = useOverlayState();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCustomerAccount();
      setRewards(data.rewards);
      setTransactions(data.transactions);
      await refresh();
    } catch {
      // session expired
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (customer) void load();
  }, [customer, load]);

  const openRedeemConfirm = (reward: LoyaltyReward) => {
    if (!customer || customer.points < reward.pointsCost) return;
    setRedeemTarget(reward);
    confirmState.open();
  };

  const handleConfirmRedeem = async () => {
    if (!redeemTarget) return;

    setRedeemingId(redeemTarget.id);
    try {
      const result = await redeemReward(redeemTarget.id);
      toast.success(result.message);
      confirmState.close();
      setRedeemTarget(null);
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "No se pudo canjear");
    } finally {
      setRedeemingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  if (!customer) return null;

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-surface-secondary" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
        <p className="text-sm text-muted">Hola, {customer.name}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{customer.points} pts</p>
        <p className="mt-1 text-sm text-muted">
          Nivel {tierLabel[customer.tier] ?? customer.tier}
        </p>
        <Button variant="secondary" size="sm" className="mt-4" onPress={() => void handleLogout()}>
          Cerrar sesión
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Premios disponibles</h2>
        {rewards.length === 0 ? (
          <p className="text-sm text-muted">No hay premios activos por ahora.</p>
        ) : (
          <ul className="grid gap-3">
            {rewards.map((reward) => {
              const canRedeem = customer.points >= reward.pointsCost;
              const applyLabel = formatRewardApplyLabel(reward);
              return (
                <li
                  key={reward.id}
                  className="rounded-2xl border border-separator bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{reward.name}</h3>
                      <p className="mt-1 text-sm text-muted">{reward.description}</p>
                      {applyLabel ? (
                        <p className="mt-1 text-xs font-medium text-accent">{applyLabel}</p>
                      ) : (
                        <p className="mt-1 text-xs text-muted">Beneficio general</p>
                      )}
                    </div>
                    <CrownDiamond width={24} height={24} className="shrink-0 text-accent" />
                  </div>
                  <div className="mt-3">
                    <RewardPointsMeter
                      currentPoints={customer.points}
                      pointsCost={reward.pointsCost}
                      label={reward.name}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-3"
                    isDisabled={!canRedeem || redeemingId === reward.id}
                    onPress={() => openRedeemConfirm(reward)}
                  >
                    {redeemingId === reward.id
                      ? "Canjeando..."
                      : canRedeem
                        ? "Reclamar premio"
                        : "Puntos insuficientes"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historial de puntos</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted">Aún no tienes movimientos.</p>
        ) : (
          <ul className="divide-y divide-separator rounded-2xl border border-separator">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{tx.reason}</p>
                  <p className="text-xs text-muted">{formatDateTime(tx.createdAt)}</p>
                </div>
                <span
                  className={`shrink-0 font-bold tabular-nums ${
                    tx.points >= 0 ? "text-accent" : "text-warning"
                  }`}
                >
                  {tx.points >= 0 ? "+" : ""}
                  {tx.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {redeemTarget ? (
        <ConfirmDialog
          state={confirmState}
          title="Confirmar canje"
          status="accent"
          confirmLabel="Reclamar premio"
          pending={redeemingId === redeemTarget.id}
          description={
            <div className="space-y-2">
              <p>
                ¿Canjear <strong>{redeemTarget.name}</strong> por{" "}
                <strong>{redeemTarget.pointsCost} puntos</strong>?
              </p>
              {formatRewardApplyLabel(redeemTarget) ? (
                <p className="text-sm text-muted">{formatRewardApplyLabel(redeemTarget)}</p>
              ) : null}
            </div>
          }
          onConfirm={handleConfirmRedeem}
        />
      ) : null}
    </div>
  );
}
